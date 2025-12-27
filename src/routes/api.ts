import type { Router } from 'express';
import { Router as ExpressRouter } from 'express';
import apiKeysRouter from './apiKeys.js';
import emailsRouter from './emails.js';

const router: Router = ExpressRouter();

router.use('/api-keys', apiKeysRouter);
router.use('/emails', emailsRouter);

export default router;

