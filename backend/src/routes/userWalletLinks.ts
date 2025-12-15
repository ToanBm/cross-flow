import { Router } from 'express';
import * as userWalletLinkController from '../controllers/userWalletLinkController';

const router = Router();

// POST /api/user-wallet-links
router.post('/', userWalletLinkController.linkWallet);

export default router;


