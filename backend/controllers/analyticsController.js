import mongoose from 'mongoose';
import Incident from '../models/Incident.js';

// Lightweight 60-second in-memory cache for analytics queries
const analyticsCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

export const getAnalytics = async (req, res) => {
  try {
    const { from, to, slaHours = 72 } = req.query;

    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (from && to && fromDate > toDate) {
      return res.status(400).json({
        message: "'from' date must be on or before 'to' date",
        errors: [{ field: 'from', message: "'from' date must be on or before 'to' date" }]
      });
    }

    const cacheKey = `${fromDate.toISOString()}_${toDate.toISOString()}_${slaHours}`;
    const cached = analyticsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const dateMatch = {
      createdAt: {
        $gte: fromDate,
        $lte: toDate
      }
    };

    const slaThresholdDate = new Date(Date.now() - Number(slaHours) * 60 * 60 * 1000);

    // Parallel Aggregation Pipelines
    const [
      totalCountResult,
      resolutionTimeResult,
      categoryCounts,
      statusCounts,
      incidentsOverTime,
      hotspotsResult,
      slaBreachesResult
    ] = await Promise.all([
      // 1. Total Incidents in Range
      Incident.countDocuments(dateMatch),

      // 2. Average Resolution Time (hours)
      Incident.aggregate([
        {
          $match: {
            ...dateMatch,
            status: 'resolved',
            'statusHistory.status': 'resolved'
          }
        },
        { $unwind: '$statusHistory' },
        { $match: { 'statusHistory.status': 'resolved' } },
        {
          $project: {
            resolutionTimeHours: {
              $divide: [
                { $subtract: ['$statusHistory.timestamp', '$createdAt'] },
                1000 * 60 * 60
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgResolutionHours: { $avg: '$resolutionTimeHours' }
          }
        }
      ]),

      // 3. Category Breakdown
      Incident.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $project: { _id: 0, category: '$_id', count: 1 } },
        { $sort: { count: -1 } }
      ]),

      // 4. Status Breakdown
      Incident.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', count: 1 } },
        { $sort: { count: -1 } }
      ]),

      // 5. Daily Incidents Over Time
      Incident.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $project: { _id: 0, date: '$_id', count: 1 } },
        { $sort: { date: 1 } }
      ]),

      // 6. Top Hotspots (approx. 2-decimal rounded coordinate clustering ~1.1km)
      Incident.aggregate([
        { $match: dateMatch },
        {
          $project: {
            lng: { $arrayElemAt: ['$location.coordinates', 0] },
            lat: { $arrayElemAt: ['$location.coordinates', 1] },
            address: 1,
            category: 1
          }
        },
        {
          $group: {
            _id: {
              latBucket: { $round: ['$lat', 2] },
              lngBucket: { $round: ['$lng', 2] }
            },
            count: { $sum: 1 },
            sampleAddress: { $first: '$address' },
            avgLat: { $avg: '$lat' },
            avgLng: { $avg: '$lng' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            lat: '$avgLat',
            lng: '$avgLng',
            address: { $ifNull: ['$sampleAddress', 'Nearby Location'] },
            count: 1
          }
        }
      ]),

      // 7. SLA Breaches (pending or in_progress older than slaHours)
      Incident.find({
        status: { $in: ['pending', 'in_progress', 'acknowledged'] },
        createdAt: { $lt: slaThresholdDate }
      })
        .select('_id title category status priority createdAt')
        .sort({ createdAt: 1 })
        .limit(20)
        .lean()
    ]);

    const slaTotalCount = await Incident.countDocuments({
      status: { $in: ['pending', 'in_progress', 'acknowledged'] },
      createdAt: { $lt: slaThresholdDate }
    });

    const slaBreaches = slaBreachesResult.map((inc) => ({
      _id: inc._id,
      title: inc.title,
      category: inc.category,
      status: inc.status,
      priority: inc.priority,
      createdAt: inc.createdAt,
      hoursOpen: Math.round((Date.now() - new Date(inc.createdAt).getTime()) / (1000 * 60 * 60))
    }));

    const avgResolutionHours =
      resolutionTimeResult.length > 0 && resolutionTimeResult[0].avgResolutionHours
        ? Math.round(resolutionTimeResult[0].avgResolutionHours * 10) / 10
        : 0;

    const responseData = {
      summary: {
        totalIncidents: totalCountResult,
        avgResolutionHours,
        slaBreachCount: slaTotalCount,
        slaThresholdHours: Number(slaHours),
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      },
      categories: categoryCounts,
      statuses: statusCounts,
      timeline: incidentsOverTime,
      hotspots: hotspotsResult,
      slaBreaches
    };

    // Store in short-lived cache
    analyticsCache.set(cacheKey, {
      timestamp: Date.now(),
      data: responseData
    });

    res.json(responseData);
  } catch (error) {
    console.error('Analytics aggregation error:', error);
    res.status(500).json({ message: 'Server error computing analytics' });
  }
};
