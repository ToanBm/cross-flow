import { Request, Response } from 'express';
import * as keyManagerService from '../services/keyManagerService';

export async function getChallenge(req: Request, res: Response) {
  try {
    const { challenge, rp } = await keyManagerService.createChallenge({
      hostname: req.hostname,
    });
    return res.json({ challenge, ...(rp ? { rp } : {}) });
  } catch (error: any) {
    console.error('[keyManager] getChallenge error', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

export async function getCredentialPublicKey(req: Request, res: Response) {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Missing credential id' });

    const publicKey = await keyManagerService.getPublicKey(id);
    if (!publicKey) return res.status(404).json({ error: 'Credential not found' });

    return res.json({ publicKey });
  } catch (error: any) {
    console.error('[keyManager] getPublicKey error', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

export async function setCredentialPublicKey(req: Request, res: Response) {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Missing credential id' });

    const { credential, publicKey } = req.body || {};

    const result = await keyManagerService.verifyAndStorePublicKey({
      credentialId: id,
      credential,
      publicKey,
      hostname: req.hostname,
    });

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(204).send();
  } catch (error: any) {
    console.error('[keyManager] setPublicKey error', error);
    return res.status(500).json({ error: 'Server error' });
  }
}


