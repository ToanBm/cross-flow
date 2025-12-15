import { Request, Response } from 'express';
import * as recipientService from '../services/recipientService';

/**
 * GET /api/recipients/:userWalletAddress
 * Get all recipients for a user
 */
export async function getRecipients(req: Request, res: Response) {
  try {
    const { userWalletAddress } = req.params;

    if (!userWalletAddress) {
      return res.status(400).json({ error: 'User wallet address is required' });
    }

    const recipients = await recipientService.getRecipientsByUser(userWalletAddress);

    res.json({ recipients });
  } catch (error: any) {
    console.error('[RecipientController] Error getting recipients:', error);
    res.status(500).json({ error: error.message || 'Failed to get recipients' });
  }
}

/**
 * POST /api/recipients
 * Create a new recipient
 */
export async function createRecipient(req: Request, res: Response) {
  try {
    const { user_wallet_address, recipient_address, recipient_name, recipient_email } = req.body;

    if (!user_wallet_address) {
      return res.status(400).json({ error: 'User wallet address is required' });
    }

    if (!recipient_address && !recipient_email) {
      return res.status(400).json({ error: 'Recipient address or email is required' });
    }

    // Validate address format if provided
    if (recipient_address && !recipient_address.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid recipient address format' });
    }

    // Validate email format if provided
    if (recipient_email && !recipient_email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const recipient = await recipientService.createRecipient({
      user_wallet_address,
      recipient_address,
      recipient_name,
      recipient_email,
      recipient_type: 'address', // Will be auto-determined by service
    });

    res.status(201).json({ recipient });
  } catch (error: any) {
    console.error('[RecipientController] Error creating recipient:', error);
    
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Failed to create recipient' });
  }
}

/**
 * PUT /api/recipients/:id
 * Update a recipient
 */
export async function updateRecipient(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { user_wallet_address, recipient_address, recipient_name, recipient_email } = req.body;

    if (!id || !user_wallet_address) {
      return res.status(400).json({ error: 'Recipient ID and user wallet address are required' });
    }

    // Validate address format if provided
    if (recipient_address && !recipient_address.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid recipient address format' });
    }

    // Validate email format if provided
    if (recipient_email && !recipient_email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const updates: any = {};
    if (recipient_address !== undefined) updates.recipient_address = recipient_address;
    if (recipient_name !== undefined) updates.recipient_name = recipient_name;
    if (recipient_email !== undefined) updates.recipient_email = recipient_email;

    const recipient = await recipientService.updateRecipient(
      parseInt(id),
      user_wallet_address,
      updates
    );

    res.json({ recipient });
  } catch (error: any) {
    console.error('[RecipientController] Error updating recipient:', error);
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Failed to update recipient' });
  }
}

/**
 * DELETE /api/recipients/:id
 * Delete a recipient
 */
export async function deleteRecipient(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { user_wallet_address } = req.body;

    if (!id || !user_wallet_address) {
      return res.status(400).json({ error: 'Recipient ID and user wallet address are required' });
    }

    await recipientService.deleteRecipient(parseInt(id), user_wallet_address);

    res.json({ message: 'Recipient deleted successfully' });
  } catch (error: any) {
    console.error('[RecipientController] Error deleting recipient:', error);
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Failed to delete recipient' });
  }
}

