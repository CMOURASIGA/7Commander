import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { env } from '../config/env.js';
import { ApiError } from '../http/api-handler.js';

const COOKIE_NAME = 'pmcc_session';

const getPrisma = async () => {
  const mod = await import('../db/prisma.js');
  return mod.prisma;
};

const parseCookieHeader = (cookieHeader?: string) => {
  if (!cookieHeader) return new Map<string, string>();
  const map = new Map<string, string>();
  cookieHeader.split(';').forEach((part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) return;
    map.set(rawKey, decodeURIComponent(rawValue.join('=')));
  });
  return map;
};

const hashSessionToken = (token: string) =>
  crypto.createHmac('sha256', env.sessionSecret || 'dev-session-secret').update(token).digest('hex');

const buildCookie = (name: string, value: string, expiresAt?: Date) => {
  const chunks = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (env.cookieSecure || env.nodeEnv === 'production') {
    chunks.push('Secure');
  }
  if (env.cookieDomain) {
    chunks.push(`Domain=${env.cookieDomain}`);
  }
  if (expiresAt) {
    chunks.push(`Expires=${expiresAt.toUTCString()}`);
  }
  return chunks.join('; ');
};

export const createSession = async (userId: string) => {
  const prisma = await getPrisma();
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const sessionTokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      sessionTokenHash,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
};

export const setSessionCookie = (res: VercelResponse, rawToken: string, expiresAt: Date) => {
  res.setHeader('Set-Cookie', buildCookie(COOKIE_NAME, rawToken, expiresAt));
};

export const clearSessionCookie = (res: VercelResponse) => {
  res.setHeader('Set-Cookie', buildCookie(COOKIE_NAME, '', new Date(0)));
};

export const getSessionFromRequest = async (req: VercelRequest) => {
  const cookieHeader = req.headers.cookie;
  const cookies = parseCookieHeader(cookieHeader);
  const rawToken = cookies.get(COOKIE_NAME);
  if (!rawToken) return null;

  const prisma = await getPrisma();
  const sessionTokenHash = hashSessionToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { sessionTokenHash },
    include: {
      user: {
        include: {
          driveContext: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  return session;
};

export const requireSession = async (req: VercelRequest) => {
  const session = await getSessionFromRequest(req);
  if (!session) {
    throw new ApiError(401, 'Not authenticated', 'UNAUTHENTICATED');
  }
  return session;
};

export const revokeSession = async (req: VercelRequest) => {
  const cookieHeader = req.headers.cookie;
  const cookies = parseCookieHeader(cookieHeader);
  const rawToken = cookies.get(COOKIE_NAME);
  if (!rawToken) return;
  const prisma = await getPrisma();
  const sessionTokenHash = hashSessionToken(rawToken);
  await prisma.session.deleteMany({
    where: { sessionTokenHash },
  });
};

