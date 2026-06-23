import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function getExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? '1h';
}

export function expiresInSeconds(): number {
  const raw = getExpiresIn();
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 3600;
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 3600);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getExpiresIn() as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}
