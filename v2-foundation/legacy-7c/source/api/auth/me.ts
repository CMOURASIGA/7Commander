import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

const hashSessionToken = (token: string) => {
  const secret = process.env.SESSION_SECRET || 'dev-session-secret';
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
      return;
    }

    const cookies = parseCookieHeader(req.headers.cookie);
    const rawToken = cookies.get('pmcc_session');
    if (!rawToken) {
      res.status(401).json({ authenticated: false });
      return;
    }

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

    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
      res.status(401).json({ authenticated: false });
      return;
    }

    res.status(200).json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
      },
      workspace: session.user.driveContext
        ? {
            rootFolderId: session.user.driveContext.rootFolderId,
            masterSpreadsheetId: session.user.driveContext.masterSpreadsheetId,
            projectsFolderId: session.user.driveContext.projectsFolderId,
          }
        : null,
      session: {
        id: session.id,
        expiresAt: session.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[api/auth/me] unhandled error', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      debug:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: 'UnknownError', message: String(error) },
    });
  }
}
