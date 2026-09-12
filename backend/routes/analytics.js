import express from 'express';
import { getAnalytics } from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { analyticsQuerySchema } from '../validators/analyticsValidators.js';

const router = express.Router();

router.get('/', protect, requireRole('authority'), validate(analyticsQuerySchema, 'query'), getAnalytics);

export default router;
