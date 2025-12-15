import { Router } from 'express';
import * as activityHistoryController from '../controllers/activityHistoryController';

const router = Router();

// POST /api/activity/log
router.post('/log', activityHistoryController.logActivity);

// GET /api/activity?wallet_address=0x...
router.get('/', activityHistoryController.getActivity);

export default router;

