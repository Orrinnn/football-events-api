"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const teamsRouter = new hono_1.Hono();
const teamSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(100),
    shortName: zod_1.z.string().trim().min(2).max(20),
    description: zod_1.z.string().trim().max(5000).nullable().optional(),
    logoUrl: zod_1.z.url().nullable().optional(),
});
const teamUpdateSchema = teamSchema.partial();
teamsRouter.get('/', async (c) => {
    const page = Number(c.req.query('page') ?? '1');
    const limit = Number(c.req.query('limit') ?? '10');
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 10 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;
    const [teams, total] = await Promise.all([
        prisma_1.prisma.team.findMany({
            skip,
            take: safeLimit,
            orderBy: { name: 'asc' },
        }),
        prisma_1.prisma.team.count(),
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
    const team = await prisma_1.prisma.team.findUnique({
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
teamsRouter.post('/', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = teamSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }
    const team = await prisma_1.prisma.team.create({
        data: {
            name: parsed.data.name,
            shortName: parsed.data.shortName,
            description: parsed.data.description ?? null,
            logoUrl: parsed.data.logoUrl ?? null,
        },
    });
    return c.json({ message: 'Team created', data: team }, 201);
});
teamsRouter.patch('/:id', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id < 1) {
        return c.json({ error: 'Invalid team id' }, 400);
    }
    const body = await c.req.json().catch(() => null);
    const parsed = teamUpdateSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }
    const existing = await prisma_1.prisma.team.findUnique({ where: { id } });
    if (!existing) {
        return c.json({ error: 'Team not found' }, 404);
    }
    const team = await prisma_1.prisma.team.update({
        where: { id },
        data: {
            ...parsed.data,
        },
    });
    return c.json({ message: 'Team updated', data: team });
});
teamsRouter.delete('/:id', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id < 1) {
        return c.json({ error: 'Invalid team id' }, 400);
    }
    const existing = await prisma_1.prisma.team.findUnique({ where: { id } });
    if (!existing) {
        return c.json({ error: 'Team not found' }, 404);
    }
    const eventsUsingTeam = await prisma_1.prisma.event.count({
        where: { teamId: id },
    });
    if (eventsUsingTeam > 0) {
        return c.json({ error: 'Cannot delete team with related events' }, 400);
    }
    await prisma_1.prisma.team.delete({
        where: { id },
    });
    return c.json({ message: 'Team deleted' });
});
exports.default = teamsRouter;
