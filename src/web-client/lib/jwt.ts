import { Role } from './auth';

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payload = ''] = token.split('.');
    if (!payload) {
      return null;
    }

    const normalizedPayload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');

    const parsed = JSON.parse(atob(normalizedPayload)) as JwtPayload;

    return parsed;
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: JwtPayload): boolean {
  return payload.exp * 1000 < Date.now();
}
