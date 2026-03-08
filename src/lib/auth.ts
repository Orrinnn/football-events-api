import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';
import type { JwtUser } from '../types';

const jwtSecret: string = process.env.JWT_SECRET || '';

if (!jwtSecret) {
  throw new Error('JWT_SECRET is not set');
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: JwtUser) {
  return jwt.sign(user, jwtSecret, { expiresIn: '7d' });
}

type DecodedJwt = JwtPayload & {
  id?: number;
  username?: string;
  email?: string;
  role?: 'admin' | 'user';
};

export function verifyToken(token: string): JwtUser | null {
  try {
    const decoded = jwt.verify(token, jwtSecret) as string | DecodedJwt;

    if (typeof decoded === 'string') {
      return null;
    }

    if (
      typeof decoded.id !== 'number' ||
      typeof decoded.username !== 'string' ||
      typeof decoded.email !== 'string' ||
      (decoded.role !== 'admin' && decoded.role !== 'user')
    ) {
      return null;
    }

    return {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}