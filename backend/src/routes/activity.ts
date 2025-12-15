import express from 'express';
import * as activityController from '../controllers/activityController';

const router = express.Router();

// GET /api/activity/:address
router.get('/:address', activityController.getActivity);

export default router;


