import express from 'express';
import {
  createIncident,
  getIncidents,
  getIncidentById,
  updateStatus,
  upvoteIncident,
  getIncidentQueue,
  assignIncident,
  unassignIncident,
  updatePriority
} from '../controllers/incidentController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import {
  createIncidentSchema,
  updateStatusSchema,
  assignIncidentSchema,
  updatePrioritySchema
} from '../validators/incidentValidators.js';

const router = express.Router();

// Public / Citizen routes
router.post('/', protect, validate(createIncidentSchema), createIncident);
router.get('/', protect, getIncidents);

// Authority triage queue route (must precede /:id to avoid id match)
router.get('/queue', protect, requireRole('authority'), getIncidentQueue);

router.get('/:id', protect, getIncidentById);
router.patch('/:id/status', protect, requireRole('authority'), validate(updateStatusSchema), updateStatus);
router.post('/:id/upvote', protect, upvoteIncident);

// Authority assignment & priority management routes
router.patch('/:id/assign', protect, requireRole('authority'), validate(assignIncidentSchema), assignIncident);
router.patch('/:id/unassign', protect, requireRole('authority'), unassignIncident);
router.patch('/:id/priority', protect, requireRole('authority'), validate(updatePrioritySchema), updatePriority);

export default router;
