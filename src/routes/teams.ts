import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import type { AppBindings } from '../types';

const teamsRouter = new Hono<AppBindings>();

const teamSchema = z.object({
  name: z.string().trim().min(2).max(100),
  shortName: z.string().trim().min(2).max(20),
  description: z.string().trim().max(5000).nullable().optional(),
  logoUrl: z.url().nullable().optional(),
});

const teamUpdateSchema = teamSchema.partial();

teamsRouter.get('/', async (c) => {
  const page = Number(c.req.query('page') ?? '1');
  const limit = Number(c.req.query('limit') ?? '10');

  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 && limit <= 10 ? limit : 10;
  const skip = (safePage - 1) * safeLimit;

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      skip,
      take: safeLimit,
      orderBy: { name: 'asc' },
    }),
    prisma.team.count(),
  ]);

  return c.json({
    data: teams,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  });
});

teamsRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  if (!Number.isInteger(id) || id < 1) {
    return c.json({ error: 'Invalid team id' }, 400);
  }

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      events: true,
    },
  });

  if (!team) {
    return c.json({ error: 'Team not found' }, 404);
  }

  return c.json({ data: team });
});

teamsRouter.post('/', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = teamSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const team = await prisma.team.create({
    data: {
      name: parsed.data.name,
      shortName: parsed.data.shortName,
      description: parsed.data.description ?? null,
      logoUrl: parsed.data.logoUrl ?? null,
    },
  });

  return c.json({ message: 'Team created', data: team }, 201);
});

teamsRouter.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'));

  if (!Number.isInteger(id) || id < 1) {
    return c.json({ error: 'Invalid team id' }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = teamUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const existing = await prisma.team.findUnique({ where: { id } });

  if (!existing) {
    return c.json({ error: 'Team not found' }, 404);
  }

  const team = await prisma.team.update({
    where: { id },
    data: {
      ...parsed.data,
    },
  });

  return c.json({ message: 'Team updated', data: team });
});

teamsRouter.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'));

  if (!Number.isInteger(id) || id < 1) {
    return c.json({ error: 'Invalid team id' }, 400);
  }

  const existing = await prisma.team.findUnique({ where: { id } });

  if (!existing) {
    return c.json({ error: 'Team not found' }, 404);
  }

  const eventsUsingTeam = await prisma.event.count({
    where: { teamId: id },
  });

  if (eventsUsingTeam > 0) {
    return c.json({ error: 'Cannot delete team with related events' }, 400);
  }

  await prisma.team.delete({
    where: { id },
  });

  return c.json({ message: 'Team deleted' });
});

export default teamsRouter;