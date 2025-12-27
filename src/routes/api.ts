import { Router } from 'express';
import apiKeysRouter from './apiKeys.js';
import emailsRouter from './emails.js';

const router = Router();

router.use('/api-keys', apiKeysRouter);
router.use('/emails', emailsRouter);

export default router;

