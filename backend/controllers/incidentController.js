import Incident from '../models/Incident.js';
import PushSubscription from '../models/PushSubscription.js';
import webpush from '../config/webPush.js';
import { getIO } from '../socket/ioInstance.js';
import { getGeoRoom } from '../utils/geoRoom.js';
import { isUserConnected } from '../socket/index.js';

/**
 * @desc    Create a new citizen-reported incident
 * @route   POST /api/incidents
 * @access  Protected (Authenticated Citizen/User)
 */
export const createIncident = async (req, res) => {
  try {
    const { title, description, category, coordinates, address, media } = req.body;

    const incident = await Incident.create({
      reporter: req.user._id,
      title,
      description,
      category,
      location: {
        type: 'Point',
        coordinates // [longitude, latitude]
      },
      address,
      media: media || [],
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          changedBy: req.user._id,
          note: 'Incident reported by citizen',
          timestamp: new Date()
        }
      ]
    });

    const populatedIncident = await Incident.findById(incident._id)
      .populate('reporter', 'name role')
      .lean();

    // Broadcast new incident to local ~10km geo room and citywide authority room
    const io = getIO();
    if (io) {
      const [lng, lat] = coordinates;
      const geoRoom = getGeoRoom(lat, lng);
      io.to(geoRoom).to('authority:all').emit('incident:new', populatedIncident || incident);
    }

    res.status(201).json(populatedIncident || incident);
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({ message: 'Server error creating incident' });
  }
};

/**
 * @desc    Get all incidents with optional geospatial, category, status, and pagination filters
 * @route   GET /api/incidents
 * @access  Protected
 */
export const getIncidents = async (req, res) => {
  try {
    const { near, radius = 2000, status, category, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    // Geospatial query
    if (near) {
      const [latStr, lngStr] = near.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      const maxDistance = parseInt(radius, 10) || 2000;

      if (!isNaN(lat) && !isNaN(lng)) {
        query.location = {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: maxDistance
          }
        };
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    let incidents;
    let total;

    if (near && query.location?.$nearSphere) {
      const [latStr, lngStr] = near.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      const maxDistance = parseInt(radius, 10) || 2000;

      const countMatch = {};
      if (status) countMatch.status = status;
      if (category) countMatch.category = category;

      const [docs, countResult] = await Promise.all([
        Incident.find(query)
          .populate('reporter', 'name role')
          .populate('assignedTo', 'name role')
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Incident.aggregate([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [lng, lat] },
              distanceField: 'dist.calculated',
              maxDistance: maxDistance,
              query: countMatch,
              spherical: true
            }
          },
          {
            $count: 'total'
          }
        ])
      ]);

      incidents = docs;
      total = countResult.length > 0 ? countResult[0].total : 0;
    } else {
      const [docs, count] = await Promise.all([
        Incident.find(query)
          .populate('reporter', 'name role')
          .populate('assignedTo', 'name role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Incident.countDocuments(query)
      ]);

      incidents = docs;
      total = count;
    }

    res.json({
      incidents,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      total
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ message: 'Server error fetching incidents' });
  }
};

/**
 * @desc    Get single incident details by ID
 * @route   GET /api/incidents/:id
 * @access  Protected
 */
export const getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reporter', 'name role')
      .populate('assignedTo', 'name role')
      .populate('statusHistory.changedBy', 'name role')
      .lean();

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    res.json(incident);
  } catch (error) {
    console.error('Get incident by ID error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Incident not found' });
    }
    res.status(500).json({ message: 'Server error fetching incident' });
  }
};

/**
 * @desc    Update incident status (Authority role only)
 * @route   PATCH /api/incidents/:id/status
 * @access  Protected (Authority only)
 */
export const updateStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    incident.status = status;
    if (!incident.assignedTo) {
      incident.assignedTo = req.user._id;
    }

    incident.statusHistory.push({
      status,
      changedBy: req.user._id,
      note: note || `Status changed to ${status}`,
      timestamp: new Date()
    });

    await incident.save();

    const populatedIncident = await Incident.findById(incident._id)
      .populate('reporter', 'name role')
      .populate('assignedTo', 'name role')
      .populate('statusHistory.changedBy', 'name role')
      .lean();

    // Broadcast status update to geo room, incident room, and authority broad room
    const io = getIO();
    if (io) {
      const [lng, lat] = incident.location.coordinates;
      const geoRoom = getGeoRoom(lat, lng);
      io.to(geoRoom)
        .to(`incident:${incident._id}`)
        .to('authority:all')
        .emit('incident:updated', populatedIncident);
    }

    // Identify stakeholders excluding current updater
    const stakeholderIds = new Set();
    if (incident.reporter) {
      stakeholderIds.add(incident.reporter.toString());
    }
    if (Array.isArray(incident.upvotes)) {
      incident.upvotes.forEach((uid) => stakeholderIds.add(uid.toString()));
    }
    stakeholderIds.delete(req.user._id.toString());

    // Filter only disconnected users
    const disconnectedUserIds = Array.from(stakeholderIds).filter(
      (userId) => !isUserConnected(userId)
    );

    // Send Web Push notifications
    if (disconnectedUserIds.length > 0) {
      (async () => {
        try {
          const subscriptions = await PushSubscription.find({
            user: { $in: disconnectedUserIds }
          });

          const payload = JSON.stringify({
            title: 'CityWatch Incident Update',
            body: `"${incident.title}" status changed to ${status.toUpperCase().replace('_', ' ')}`,
            incidentId: incident._id.toString()
          });

          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: sub.keys
                },
                payload
              );
            } catch (pushErr) {
              if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                await PushSubscription.deleteOne({ _id: sub._id });
              }
            }
          }
        } catch (pushError) {
          console.error('Web push dispatch error:', pushError);
        }
      })();
    }

    res.json(populatedIncident);
  } catch (error) {
    console.error('Update incident status error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Incident not found' });
    }
    res.status(500).json({ message: 'Server error updating incident status' });
  }
};

/**
 * @desc    Upvote an incident
 * @route   POST /api/incidents/:id/upvote
 * @access  Protected
 */
export const upvoteIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const userIdStr = req.user._id.toString();
    const alreadyUpvoted = incident.upvotes.some(
      (id) => id.toString() === userIdStr
    );

    let isUpvoted = false;
    let message = '';

    if (alreadyUpvoted) {
      incident.upvotes = incident.upvotes.filter(
        (id) => id.toString() !== userIdStr
      );
      isUpvoted = false;
      message = 'Incident unvoted successfully';
    } else {
      incident.upvotes.push(req.user._id);
      isUpvoted = true;
      message = 'Incident upvoted successfully';
    }

    await incident.save();

    // Broadcast upvote to incident room and authority dashboard
    const io = getIO();
    if (io) {
      io.to(`incident:${incident._id}`)
        .to('authority:all')
        .emit('incident:upvoted', {
          incidentId: incident._id.toString(),
          upvoteCount: incident.upvotes.length
        });
    }

    res.json({
      message,
      upvotesCount: incident.upvotes.length,
      upvoted: isUpvoted
    });
  } catch (error) {
    console.error('Upvote incident error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Incident not found' });
    }
    res.status(500).json({ message: 'Server error upvoting incident' });
  }
};

/**
 * @desc    Get authority triage incident queue with filtering, sorting, and pagination
 * @route   GET /api/incidents/queue
 * @access  Protected (Authority only)
 */
export const getIncidentQueue = async (req, res) => {
  try {
    const {
      status,
      category,
      priority,
      assignedTo,
      sortBy = 'priority',
      page = 1,
      limit = 25
    } = req.query;

    const query = {};

    // Status filter: default to excluding resolved and rejected unless explicitly specified
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      query.status = { $nin: ['resolved', 'rejected'] };
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Assignment filter
    if (assignedTo === 'me') {
      query.assignedTo = req.user._id;
    } else if (assignedTo === 'unassigned') {
      query.assignedTo = { $in: [null, undefined] };
    } else if (assignedTo && assignedTo !== 'all') {
      query.assignedTo = assignedTo;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    // Sorting strategy
    let mongoSort = { createdAt: -1 };
    let useAggregationForPriority = false;

    if (sortBy === 'oldest' || sortBy === 'createdAt') {
      mongoSort = { createdAt: 1 }; // Oldest first to surface neglected reports
    } else if (sortBy === 'newest') {
      mongoSort = { createdAt: -1 };
    } else if (sortBy === 'upvotes') {
      // Handled via aggregation or direct sort
      useAggregationForPriority = false;
    } else if (sortBy === 'priority') {
      useAggregationForPriority = true;
    }

    let incidents;
    let total = await Incident.countDocuments(query);

    if (useAggregationForPriority) {
      // Custom priority weight sorting: critical (4) > high (3) > medium (2) > low (1)
      incidents = await Incident.aggregate([
        { $match: query },
        {
          $addFields: {
            priorityWeight: {
              $switch: {
                branches: [
                  { case: { $eq: ['$priority', 'critical'] }, then: 4 },
                  { case: { $eq: ['$priority', 'high'] }, then: 3 },
                  { case: { $eq: ['$priority', 'medium'] }, then: 2 },
                  { case: { $eq: ['$priority', 'low'] }, then: 1 }
                ],
                default: 0
              }
            }
          }
        },
        { $sort: { priorityWeight: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: 'users',
            localField: 'reporter',
            foreignField: '_id',
            as: 'reporter'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'assignedTo',
            foreignField: '_id',
            as: 'assignedTo'
          }
        },
        { $unwind: { path: '$reporter', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$assignedTo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            'reporter.password': 0,
            'reporter.email': 0,
            'assignedTo.password': 0,
            'assignedTo.email': 0
          }
        }
      ]);
    } else if (sortBy === 'upvotes') {
      incidents = await Incident.aggregate([
        { $match: query },
        {
          $addFields: {
            upvotesCount: { $size: { $ifNull: ['$upvotes', []] } }
          }
        },
        { $sort: { upvotesCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: 'users',
            localField: 'reporter',
            foreignField: '_id',
            as: 'reporter'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'assignedTo',
            foreignField: '_id',
            as: 'assignedTo'
          }
        },
        { $unwind: { path: '$reporter', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$assignedTo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            'reporter.password': 0,
            'reporter.email': 0,
            'assignedTo.password': 0,
            'assignedTo.email': 0
          }
        }
      ]);
    } else {
      incidents = await Incident.find(query)
        .populate('reporter', 'name role')
        .populate('assignedTo', 'name role')
        .sort(mongoSort)
        .skip(skip)
        .limit(limitNum)
        .lean();
    }

    res.json({
      incidents,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      total
    });
  } catch (error) {
    console.error('Get incident queue error:', error);
    res.status(500).json({ message: 'Server error fetching incident queue' });
  }
};

/**
 * @desc    Claim or reassign an incident (Authority role only)
 * @route   PATCH /api/incidents/:id/assign
 * @access  Protected (Authority only)
 */
export const assignIncident = async (req, res) => {
  try {
    const { force = false } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Check if already assigned to someone else
    if (
      incident.assignedTo &&
      incident.assignedTo.toString() !== req.user._id.toString() &&
      !force
    ) {
      return res.status(409).json({
        message: 'Incident is already assigned to another authority user. Use force=true to override.',
        assignedTo: incident.assignedTo
      });
    }

    const wasReassigned = !!incident.assignedTo && incident.assignedTo.toString() !== req.user._id.toString();
    incident.assignedTo = req.user._id;

    if (wasReassigned) {
      incident.statusHistory.push({
        status: incident.status,
        changedBy: req.user._id,
        note: `Reassigned to authority user ${req.user.name}`,
        timestamp: new Date()
      });
    }

    await incident.save();

    const populated = await Incident.findById(incident._id)
      .populate('reporter', 'name role')
      .populate('assignedTo', 'name role')
      .populate('statusHistory.changedBy', 'name role')
      .lean();

    // Broadcast assignment update
    const io = getIO();
    if (io) {
      const [lng, lat] = incident.location.coordinates;
      const geoRoom = getGeoRoom(lat, lng);
      io.to(geoRoom)
        .to(`incident:${incident._id}`)
        .to('authority:all')
        .emit('incident:assigned', populated);
      io.to(geoRoom)
        .to(`incident:${incident._id}`)
        .to('authority:all')
        .emit('incident:updated', populated);
    }

    res.json(populated);
  } catch (error) {
    console.error('Assign incident error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Incident not found' });
    }
    res.status(500).json({ message: 'Server error assigning incident' });
  }
};

/**
 * @desc    Unassign an incident (Authority role only)
 * @route   PATCH /api/incidents/:id/unassign
 * @access  Protected (Authority only)
 */
export const unassignIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    if (!incident.assignedTo) {
      return res.status(400).json({ message: 'Incident is not currently assigned' });
    }

    incident.assignedTo = undefined;
    incident.statusHistory.push({
      status: incident.status,
      changedBy: req.user._id,
      note: 'Incident unassigned from authority',
      timestamp: new Date()
    });

    await incident.save();

    const populated = await Incident.findById(incident._id)
      .populate('reporter', 'name role')
      .populate('assignedTo', 'name role')
      .populate('statusHistory.changedBy', 'name role')
      .lean();

    // Broadcast unassignment update
    const io = getIO();
    if (io) {
      const [lng, lat] = incident.location.coordinates;
      const geoRoom = getGeoRoom(lat, lng);
      io.to(geoRoom)
        .to(`incident:${incident._id}`)
        .to('authority:all')
        .emit('incident:unassigned', populated);
      io.to(geoRoom)
        .to(`incident:${incident._id}`)
        .to('authority:all')
        .emit('incident:updated', populated);
    }

    res.json(populated);
  } catch (error) {
    console.error('Unassign incident error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Incident not found' });
    }
    res.status(500).json({ message: 'Server error unassigning incident' });
  }
};

/**
 * @desc    Update incident priority (Authority role only)
 * @route   PATCH /api/incidents/:id/priority
 * @access  Protected (Authority only)
 */
export const updatePriority = async (req, res) => {
  try {
    const { priority, note } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    incident.priority = priority;
    incident.statusHistory.push({
      status: incident.status,
      changedBy: req.user._id,
      note: note || `Priority updated to ${priority}`,
      timestamp: new Date()
    });

    await incident.save();

    const populated = await Incident.findById(incident._id)
      .populate('reporter', 'name role')
      .populate('assignedTo', 'name role')
      .populate('statusHistory.changedBy', 'name role')
      .lean();

    // Broadcast priority update to all active listeners
    const io = getIO();
    if (io) {
      const [lng, lat] = incident.location.coordinates;
      const geoRoom = getGeoRoom(lat, lng);
      io.to(geoRoom)
        .to(`incident:${incident._id}`)
        .to('authority:all')
        .emit('incident:updated', populated);
    }

    res.json(populated);
  } catch (error) {
    console.error('Update priority error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Incident not found' });
    }
    res.status(500).json({ message: 'Server error updating priority' });
  }
};

/**
 * @desc    Delete/Remove an incident (Authority role only)
 * @route   DELETE /api/incidents/:id
 * @access  Protected (Authority only)
 */
export const deleteIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const [lng, lat] = incident.location?.coordinates || [0, 0];
    await Incident.findByIdAndDelete(req.params.id);

    // Broadcast deletion to geo room, incident room, and authority broad room
    const io = getIO();
    if (io) {
      const geoRoom = getGeoRoom(lat, lng);
      io.to(geoRoom)
        .to(`incident:${incident._id}`)
        .to('authority:all')
        .emit('incident:deleted', { incidentId: incident._id.toString() });
    }

    res.json({ message: 'Incident removed successfully', incidentId: incident._id });
  } catch (error) {
    console.error('Delete incident error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Incident not found' });
    }
    res.status(500).json({ message: 'Server error deleting incident' });
  }
};

