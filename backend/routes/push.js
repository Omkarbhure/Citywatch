import express from 'express';
import { subscribe, unsubscribe } from '../controllers/pushController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { pushSubscriptionSchema, unsubscribeSchema } from '../validators/pushValidators.js';

const router = express.Router();

router.post('/subscribe', protect, validate(pushSubscriptionSchema), subscribe);
router.post('/unsubscribe', protect, validate(unsubscribeSchema), unsubscribe);

export default router;
