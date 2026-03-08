"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const eventsRouter = new hono_1.Hono();
const eventSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(3).max(150),
    description: zod_1.z.string().trim().max(5000).nullable().optional(),
    eventDate: zod_1.z.iso.datetime(),
    maxParticipants: zod_1.z.number().int().positive().nullable().optional(),
    imageUrl: zod_1.z.url().nullable().optional(),
    isOpen: zod_1.z.boolean().optional(),
    categoryId: zod_1.z.number().int().positive(),
    venueId: zod_1.z.number().int().positive(),
    teamId: zod_1.z.number().int().positive(),
});
const eventUpdateSchema = eventSchema.partial();
eventsRouter.get('/', async (c) => {
    const page = Number(c.req.query('page') ?? '1');
    const limit = Number(c.req.query('limit') ?? '10');
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 10 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;
    const [events, total] = await Promise.all([
        prisma_1.prisma.event.findMany({
            skip,
            take: safeLimit,
            orderBy: { eventDate: 'asc' },
            include: {
                category: true,
                venue: true,
                team: true,
            },
        }),
        prisma_1.prisma.event.count(),
    ]);
    return c.json({
        data: events,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit),
        },
    });
});
eventsRouter.get('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id < 1) {
        return c.json({ error: 'Invalid event id' }, 400);
    }
    const event = await prisma_1.prisma.event.findUnique({
        where: { id },
        include: {
            category: true,
            venue: true,
            team: true,
            createdBy: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                },
            },
            registrations: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });
    if (!event) {
        return c.json({ error: 'Event not found' }, 404);
    }
    return c.json({ data: event });
});
eventsRouter.post('/', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }
    const user = c.get('user');
    const data = parsed.data;
    const [category, venue, team] = await Promise.all([
        prisma_1.prisma.category.findUnique({ where: { id: data.categoryId } }),
        prisma_1.prisma.venue.findUnique({ where: { id: data.venueId } }),
        prisma_1.prisma.team.findUnique({ where: { id: data.teamId } }),
    ]);
    if (!category || !venue || !team) {
        return c.json({ error: 'Related category, venue or team not found' }, 400);
    }
    const event = await prisma_1.prisma.event.create({
        data: {
            ...data,
            description: data.description ?? null,
            maxParticipants: data.maxParticipants ?? null,
            imageUrl: data.imageUrl ?? null,
            isOpen: data.isOpen ?? true,
            eventDate: new Date(data.eventDate),
            createdById: user.id,
        },
    });
    return c.json({ message: 'Event created', data: event }, 201);
});
eventsRouter.patch('/:id', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id < 1) {
        return c.json({ error: 'Invalid event id' }, 400);
    }
    const body = await c.req.json().catch(() => null);
    const parsed = eventUpdateSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }
    const existingEvent = await prisma_1.prisma.event.findUnique({
        where: { id },
    });
    if (!existingEvent) {
        return c.json({ error: 'Event not found' }, 404);
    }
    const data = parsed.data;
    if (data.categoryId) {
        const category = await prisma_1.prisma.category.findUnique({ where: { id: data.categoryId } });
        if (!category)
            return c.json({ error: 'Category not found' }, 400);
    }
    if (data.venueId) {
        const venue = await prisma_1.prisma.venue.findUnique({ where: { id: data.venueId } });
        if (!venue)
            return c.json({ error: 'Venue not found' }, 400);
    }
    if (data.teamId) {
        const team = await prisma_1.prisma.team.findUnique({ where: { id: data.teamId } });
        if (!team)
            return c.json({ error: 'Team not found' }, 400);
    }
    const event = await prisma_1.prisma.event.update({
        where: { id },
        data: {
            ...data,
            eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        },
    });
    return c.json({ message: 'Event updated', data: event });
});
eventsRouter.delete('/:id', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id < 1) {
        return c.json({ error: 'Invalid event id' }, 400);
    }
    const event = await prisma_1.prisma.event.findUnique({ where: { id } });
    if (!event) {
        return c.json({ error: 'Event not found' }, 404);
    }
    await prisma_1.prisma.registration.deleteMany({
        where: { eventId: id },
    });
    await prisma_1.prisma.event.delete({
        where: { id },
    });
    return c.json({ message: 'Event deleted' });
});
exports.default = eventsRouter;
