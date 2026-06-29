import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface TokenPayload {
  id: string;
  email: string;
  role: 'student' | 'admin';
  sessionId: string;
}

export interface RefreshTokenPayload {
  id: string;
  sessionId: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '15m' }); // Short-lived access token: 15 minutes
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '7d' }); // Long-lived refresh token: 7 days
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as RefreshTokenPayload;
}
