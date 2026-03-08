import { createMiddleware } from 'hono/factory';
import type { AppBindings } from '../types';
import { verifyToken } from '../lib/auth';

export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const user = verifyToken(token);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', user);
  await next();
});