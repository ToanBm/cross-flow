import { Router } from 'express';
import * as bankAccountController from '../controllers/bankAccountController';

const router = Router();

// GET /api/bank-accounts?email=...
router.get('/', bankAccountController.listBankAccounts);

// POST /api/bank-accounts
router.post('/', bankAccountController.createOrUpdateBankAccount);

export default router;


