import type { Request, Response, Router } from 'express';
import { Router as ExpressRouter } from 'express';

const router: Router = ExpressRouter();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;

