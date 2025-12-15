import express from 'express';
import * as recipientController from '../controllers/recipientController';

const router = express.Router();

// GET /api/recipients/:userWalletAddress
router.get('/:userWalletAddress', recipientController.getRecipients);

// POST /api/recipients
router.post('/', recipientController.createRecipient);

// PUT /api/recipients/:id
router.put('/:id', recipientController.updateRecipient);

// DELETE /api/recipients/:id
router.delete('/:id', recipientController.deleteRecipient);

export default router;

