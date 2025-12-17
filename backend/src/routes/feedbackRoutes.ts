import { Router, Request, Response } from 'express';
import { createFeedback, getAllFeedbacks } from '../services/feedbackService';

const router = Router();

/**
 * POST /api/feedback
 * Submit new feedback
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, email, user_address } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const feedback = await createFeedback({
      message: message.trim(),
      email: email || null,
      user_address: user_address || null,
    });

    console.log('[Feedback] New feedback received:', {
      id: feedback.id,
      email: feedback.email,
      message: feedback.message.substring(0, 50) + '...',
    });

    return res.status(201).json({
      success: true,
      feedback: {
        id: feedback.id,
        created_at: feedback.created_at,
      },
    });
  } catch (error: any) {
    console.error('[Feedback] Error creating feedback:', error);
    return res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * GET /api/feedback
 * Get all feedbacks (admin only - add auth later)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const feedbacks = await getAllFeedbacks();
    return res.json({ feedbacks });
  } catch (error: any) {
    console.error('[Feedback] Error getting feedbacks:', error);
    return res.status(500).json({ error: 'Failed to get feedbacks' });
  }
});

export default router;

