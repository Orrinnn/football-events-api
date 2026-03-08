import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { comparePassword, generateToken, hashPassword } from '../lib/auth';

const authRouter = new Hono();

const registerSchema = z.object({
  username: z.string().trim().min(3).max(50),
  email: z.email().trim().max(100),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email: z.email().trim().max(100),
  password: z.string().min(6).max(100),
});

authRouter.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const { username, email, password } = parsed.data;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingUser) {
    return c.json({ error: 'Username or email already exists' }, 400);
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      role: 'user',
    },
  });

  const token = generateToken({
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

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const passwordMatch = await comparePassword(password, user.password);

  if (!passwordMatch) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = generateToken({
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

export default authRouter;