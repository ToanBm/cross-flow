import express from 'express';
import * as keyManagerController from '../controllers/keyManagerController';

const router = express.Router();

// KeyManager contract (tempo.ts KeyManager.http):
// - GET  /challenge
// - GET  /:id
// - POST /:id
router.get('/challenge', keyManagerController.getChallenge);
router.get('/:id', keyManagerController.getCredentialPublicKey);
router.post('/:id', keyManagerController.setCredentialPublicKey);

export default router;


