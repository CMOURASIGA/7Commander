import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

const readEnv = (key: string, fallback?: string) => {
  const value = process.env[key];
  if (value === undefined || value === null || value === '') return fallback;
  return value;
};

const requireEnv = (key: string) => {
  const value = readEnv(key);
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

const parseCode = (req: VercelRequest) => {
  if (req.method === 'GET') {
    const queryCode = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
    if (!queryCode || typeof queryCode !== 'string') throw new Error('Missing Google auth code');
    return queryCode;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const code = (body as { code?: unknown }).code;
  if (!code || typeof code !== 'string') throw new Error('Missing Google auth code');
  return code;
};

const hashSessionToken = (rawToken: string) => {
  const secret = readEnv('SESSION_SECRET', 'dev-session-secret')!;
  return crypto.createHmac('sha256', secret).update(rawToken).digest('hex');
};

const buildCookie = (rawToken: string, expiresAt: Date) => {
  const cookieSecure = ['1', 'true', 'yes', 'on'].includes((readEnv('COOKIE_SECURE', 'false') || '').toLowerCase());
  const nodeEnv = readEnv('NODE_ENV', 'development');
  const cookieDomain = readEnv('COOKIE_DOMAIN');

  const chunks = [
    `pmcc_session=${encodeURIComponent(rawToken)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (cookieSecure || nodeEnv === 'production') chunks.push('Secure');
  if (cookieDomain) chunks.push(`Domain=${cookieDomain}`);
  return chunks.join('; ');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
      return;
    }

    const clientId = requireEnv('GOOGLE_CLIENT_ID');
    const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');
    const redirectUri = requireEnv('GOOGLE_REDIRECT_URI');
    const code = parseCode(req);

    const oauthClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauthClient });
    const { data } = await oauth2.userinfo.get();
    if (!data.id || !data.email || !data.name) {
      throw new Error('Unable to read required Google profile fields');
    }

    const user = await prisma.user.upsert({
      where: { googleSub: data.id },
      update: {
        email: data.email.toLowerCase(),
        name: data.name,
        picture: data.picture || null,
        lastLoginAt: new Date(),
      },
      create: {
        googleSub: data.id,
        email: data.email.toLowerCase(),
        name: data.name,
        picture: data.picture || null,
        lastLoginAt: new Date(),
      },
    });

    await prisma.googleCredential.upsert({
      where: { userId: user.id },
      update: {
        accessToken: tokens.access_token || undefined,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        scope: tokens.scope || undefined,
        tokenType: tokens.token_type || undefined,
      },
      create: {
        userId: user.id,
        accessToken: tokens.access_token || undefined,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        scope: tokens.scope || undefined,
        tokenType: tokens.token_type || undefined,
      },
    });

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const sessionTokenHash = hashSessionToken(rawToken);
    const sessionTtlHours = Number(readEnv('SESSION_TTL_HOURS', '168'));
    const expiresAt = new Date(Date.now() + sessionTtlHours * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        sessionTokenHash,
        expiresAt,
      },
    });

    res.setHeader('Set-Cookie', buildCookie(rawToken, expiresAt));

    if (req.method === 'GET') {
      const frontendUrl = readEnv('FRONTEND_URL', 'http://localhost:5173')!;
      res.setHeader('Location', frontendUrl);
      res.status(302).end();
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      workspace: null,
    });
  } catch (error) {
    console.error('[api/auth/google/callback] unhandled error', error);
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
