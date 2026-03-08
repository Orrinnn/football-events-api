"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const venuesRouter = new hono_1.Hono();
const venueSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(100),
    address: zod_1.z.string().trim().min(2).max(150),
    city: zod_1.z.string().trim().min(2).max(100),
    capacity: zod_1.z.number().int().positive().nullable().optional(),
    imageUrl: zod_1.z.url().nullable().optional(),
});
const venueUpdateSchema = venueSchema.partial();
venuesRouter.get('/', async (c) => {
    const page = Number(c.req.query('page') ?? '1');
    const limit = Number(c.req.query('limit') ?? '10');
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 10 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;
    const [venues, total] = await Promise.all([
        prisma_1.prisma.venue.findMany({
            skip,
            take: safeLimit,
            orderBy: { name: 'asc' },
        }),
        prisma_1.prisma.venue.count(),
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
    const venue = await prisma_1.prisma.venue.findUnique({
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
venuesRouter.post('/', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = venueSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }
    const venue = await prisma_1.prisma.venue.create({
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
venuesRouter.patch('/:id', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id < 1) {
        return c.json({ error: 'Invalid venue id' }, 400);
    }
    const body = await c.req.json().catch(() => null);
    const parsed = venueUpdateSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }
    const existing = await prisma_1.prisma.venue.findUnique({ where: { id } });
    if (!existing) {
        return c.json({ error: 'Venue not found' }, 404);
    }
    const venue = await prisma_1.prisma.venue.update({
        where: { id },
        data: {
            ...parsed.data,
        },
    });
    return c.json({ message: 'Venue updated', data: venue });
});
venuesRouter.delete('/:id', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id < 1) {
        return c.json({ error: 'Invalid venue id' }, 400);
    }
    const existing = await prisma_1.prisma.venue.findUnique({ where: { id } });
    if (!existing) {
        return c.json({ error: 'Venue not found' }, 404);
    }
    const eventsUsingVenue = await prisma_1.prisma.event.count({
        where: { venueId: id },
    });
    if (eventsUsingVenue > 0) {
        return c.json({ error: 'Cannot delete venue with related events' }, 400);
    }
    await prisma_1.prisma.venue.delete({
        where: { id },
    });
    return c.json({ message: 'Venue deleted' });
});
exports.default = venuesRouter;
