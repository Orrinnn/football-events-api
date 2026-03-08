"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../lib/auth");
const authRouter = new hono_1.Hono();
const registerSchema = zod_1.z.object({
    username: zod_1.z.string().trim().min(3).max(50),
    email: zod_1.z.email().trim().max(100),
    password: zod_1.z.string().min(6).max(100),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.email().trim().max(100),
    password: zod_1.z.string().min(6).max(100),
});
authRouter.post('/register', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }
    const { username, email, password } = parsed.data;
    const existingUser = await prisma_1.prisma.user.findFirst({
        where: {
            OR: [{ username }, { email }],
        },
    });
    if (existingUser) {
        return c.json({ error: 'Username or email already exists' }, 400);
    }
    const hashedPassword = await (0, auth_1.hashPassword)(password);
    const user = await prisma_1.prisma.user.create({
        data: {
            username,
            email,
            password: hashedPassword,
            role: 'user',
        },
    });
    const token = (0, auth_1.generateToken)({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
    });
    return c.json({
        message: 'User created successfully',
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        },
    }, 201);
});
authRouter.post('/login', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }
    const { email, password } = parsed.data;
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        return c.json({ error: 'Invalid email or password' }, 401);
    }
    const passwordMatch = await (0, auth_1.comparePassword)(password, user.password);
    if (!passwordMatch) {
        return c.json({ error: 'Invalid email or password' }, 401);
    }
    const token = (0, auth_1.generateToken)({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
    });
    return c.json({
        message: 'Login successful',
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        },
    });
});
exports.default = authRouter;
