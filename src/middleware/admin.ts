import { createMiddleware } from 'hono/factory';
import type { AppBindings } from '../types';

export const requireAdmin = createMiddleware<AppBindings>(async (c, next) => {
  const user = c.get('user');

  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
});