import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import type { AppBindings } from '../types';

const venuesRouter = new Hono<AppBindings>();

const venueSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().min(2).max(150),
  city: z.string().trim().min(2).max(100),
  capacity: z.number().int().positive().nullable().optional(),
  imageUrl: z.url().nullable().optional(),
});

const venueUpdateSchema = venueSchema.partial();

venuesRouter.get('/', async (c) => {
  const page = Number(c.req.query('page') ?? '1');
  const limit = Number(c.req.query('limit') ?? '10');

  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 && limit <= 10 ? limit : 10;
  const skip = (safePage - 1) * safeLimit;

  const [venues, total] = await Promise.all([
    prisma.venue.findMany({
      skip,
      take: safeLimit,
      orderBy: { name: 'asc' },
    }),
    prisma.venue.count(),
  ]);

  return c.json({
    data: venues,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  });
});

venuesRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  if (!Number.isInteger(id) || id < 1) {
    return c.json({ error: 'Invalid venue id' }, 400);
  }

  const venue = await prisma.venue.findUnique({
    where: { id },
    include: {
      events: true,
    },
  });

  if (!venue) {
    return c.json({ error: 'Venue not found' }, 404);
  }

  return c.json({ data: venue });
});

venuesRouter.post('/', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = venueSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const venue = await prisma.venue.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      capacity: parsed.data.capacity ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
    },
  });

  return c.json({ message: 'Venue created', data: venue }, 201);
});

venuesRouter.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'));

  if (!Number.isInteger(id) || id < 1) {
    return c.json({ error: 'Invalid venue id' }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = venueUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const existing = await prisma.venue.findUnique({ where: { id } });

  if (!existing) {
    return c.json({ error: 'Venue not found' }, 404);
  }

  const venue = await prisma.venue.update({
    where: { id },
    data: {
      ...parsed.data,
    },
  });

  return c.json({ message: 'Venue updated', data: venue });
});

venuesRouter.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'));

  if (!Number.isInteger(id) || id < 1) {
    return c.json({ error: 'Invalid venue id' }, 400);
  }

  const existing = await prisma.venue.findUnique({ where: { id } });

  if (!existing) {
    return c.json({ error: 'Venue not found' }, 404);
  }

  const eventsUsingVenue = await prisma.event.count({
    where: { venueId: id },
  });

  if (eventsUsingVenue > 0) {
    return c.json({ error: 'Cannot delete venue with related events' }, 400);
  }

  await prisma.venue.delete({
    where: { id },
  });

  return c.json({ message: 'Venue deleted' });
});

export default venuesRouter;