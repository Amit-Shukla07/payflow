import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthenticatedUser } from '../types/index.js';

export function signToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN as any,
    }
  );
}

export function verifyToken(token: string): AuthenticatedUser {
  const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & AuthenticatedUser;
  return {
    id: decoded.id,
    email: decoded.email,
    name: decoded.name,
  };
}

