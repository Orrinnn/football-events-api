"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const categoriesRouter = new hono_1.Hono();
const categorySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(50),
});
const categoryUpdateSchema = categorySchema.partial();
categoriesRouter.get('/', async (c) => {
    const page = Number(c.req.query('page') ?? '1');
    const limit = Number(c.req.query('limit') ?? '10');
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 10 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;
    const [categories, total] = await Promise.all([
        prisma_1.prisma.category.findMany({
            skip,
            take: safeLimit,
            orderBy: { name: 'asc' },
        }),
        prisma_1.prisma.category.count(),
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
    const category = await prisma_1.prisma.category.findUnique({
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
categoriesRouter.post('/', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }
    const category = await prisma_1.prisma.category.create({
        data: parsed.data,
    });
    return c.json({ message: 'Category created', data: category }, 201);
});
categoriesRouter.patch('/:id', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id < 1) {
        return c.json({ error: 'Invalid category id' }, 400);
    }
    const body = await c.req.json().catch(() => null);
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }
    const existing = await prisma_1.prisma.category.findUnique({ where: { id } });
    if (!existing) {
        return c.json({ error: 'Category not found' }, 404);
    }
    const category = await prisma_1.prisma.category.update({
        where: { id },
        data: parsed.data,
    });
    return c.json({ message: 'Category updated', data: category });
});
categoriesRouter.delete('/:id', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id < 1) {
        return c.json({ error: 'Invalid category id' }, 400);
    }
    const existing = await prisma_1.prisma.category.findUnique({ where: { id } });
    if (!existing) {
        return c.json({ error: 'Category not found' }, 404);
    }
    const eventsUsingCategory = await prisma_1.prisma.event.count({
        where: { categoryId: id },
    });
    if (eventsUsingCategory > 0) {
        return c.json({ error: 'Cannot delete category with related events' }, 400);
    }
    await prisma_1.prisma.category.delete({
        where: { id },
    });
    return c.json({ message: 'Category deleted' });
});
exports.default = categoriesRouter;
