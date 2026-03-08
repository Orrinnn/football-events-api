"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const registrationsRouter = new hono_1.Hono();
registrationsRouter.post('/events/:id/register', auth_1.requireAuth, async (c) => {
    const eventId = Number(c.req.param('id'));
    const user = c.get('user');
    if (!Number.isInteger(eventId) || eventId < 1) {
        return c.json({ error: 'Invalid event id' }, 400);
    }
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        include: {
            registrations: true,
        },
    });
    if (!event) {
        return c.json({ error: 'Event not found' }, 404);
    }
    if (!event.isOpen) {
        return c.json({ error: 'Registration is closed for this event' }, 400);
    }
    if (event.maxParticipants !== null &&
        event.registrations.length >= event.maxParticipants) {
        return c.json({ error: 'Event is full' }, 400);
    }
    const existingRegistration = await prisma_1.prisma.registration.findUnique({
        where: {
            userId_eventId: {
                userId: user.id,
                eventId,
            },
        },
    });
    if (existingRegistration) {
        return c.json({ error: 'User is already registered for this event' }, 400);
    }
    const registration = await prisma_1.prisma.registration.create({
        data: {
            userId: user.id,
            eventId,
        },
    });
    return c.json({ message: 'Registration created', data: registration }, 201);
});
registrationsRouter.get('/registrations', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const page = Number(c.req.query('page') ?? '1');
    const limit = Number(c.req.query('limit') ?? '10');
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 10 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;
    const [registrations, total] = await Promise.all([
        prisma_1.prisma.registration.findMany({
            skip,
            take: safeLimit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                event: {
                    select: {
                        id: true,
                        title: true,
                        eventDate: true,
                    },
                },
            },
        }),
        prisma_1.prisma.registration.count(),
    ]);
    return c.json({
        data: registrations,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit),
        },
    });
});
registrationsRouter.delete('/registrations/:id', auth_1.requireAuth, async (c) => {
    const id = Number(c.req.param('id'));
    const user = c.get('user');
    if (!Number.isInteger(id) || id < 1) {
        return c.json({ error: 'Invalid registration id' }, 400);
    }
    const registration = await prisma_1.prisma.registration.findUnique({
        where: { id },
    });
    if (!registration) {
        return c.json({ error: 'Registration not found' }, 404);
    }
    if (user.role !== 'admin' && registration.userId !== user.id) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    await prisma_1.prisma.registration.delete({
        where: { id },
    });
    return c.json({ message: 'Registration deleted' });
});
exports.default = registrationsRouter;
