import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import type { AppBindings } from '../types';

const categoriesRouter = new Hono<AppBindings>();

const categorySchema = z.object({
  name: z.string().trim().min(2).max(50),
});

const categoryUpdateSchema = categorySchema.partial();

categoriesRouter.get('/', async (c) => {
  const page = Number(c.req.query('page') ?? '1');
  const limit = Number(c.req.query('limit') ?? '10');

  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 && limit <= 10 ? limit : 10;
  const skip = (safePage - 1) * safeLimit;

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      skip,
      take: safeLimit,
      orderBy: { name: 'asc' },
    }),
    prisma.category.count(),
  ]);

  return c.json({
    data: categories,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  });
});

categoriesRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  if (!Number.isInteger(id) || id < 1) {
    return c.json({ error: 'Invalid category id' }, 400);
  }

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      events: true,
    },
  });

  if (!category) {
    return c.json({ error: 'Category not found' }, 404);
  }

  return c.json({ data: category });
});

categoriesRouter.post('/', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const category = await prisma.category.create({
    data: parsed.data,
  });

  return c.json({ message: 'Category created', data: category }, 201);
});

categoriesRouter.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'));

  if (!Number.isInteger(id) || id < 1) {
    return c.json({ error: 'Invalid category id' }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = categoryUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const existing = await prisma.category.findUnique({ where: { id } });

  if (!existing) {
    return c.json({ error: 'Category not found' }, 404);
  }

  const category = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });

  return c.json({ message: 'Category updated', data: category });
});

categoriesRouter.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'));

  if (!Number.isInteger(id) || id < 1) {
    return c.json({ error: 'Invalid category id' }, 400);
  }

  const existing = await prisma.category.findUnique({ where: { id } });

  if (!existing) {
    return c.json({ error: 'Category not found' }, 404);
  }

  const eventsUsingCategory = await prisma.event.count({
    where: { categoryId: id },
  });

  if (eventsUsingCategory > 0) {
    return c.json({ error: 'Cannot delete category with related events' }, 400);
  }

  await prisma.category.delete({
    where: { id },
  });

  return c.json({ message: 'Category deleted' });
});

export default categoriesRouter;