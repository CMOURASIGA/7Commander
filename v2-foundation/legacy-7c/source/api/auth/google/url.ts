import type { VercelRequest, VercelResponse } from '@vercel/node';

const readState = (req: VercelRequest) => {
  if (req.method === 'GET') {
    const state = Array.isArray(req.query?.state) ? req.query?.state[0] : req.query?.state;
    return typeof state === 'string' && state.length > 0 ? state : undefined;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const state = (body as { state?: unknown }).state;
  return typeof state === 'string' && state.length > 0 ? state : undefined;
};

const requireEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const buildAuthUrl = (state?: string) => {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const redirectUri = requireEnv('GOOGLE_REDIRECT_URI');

  const scopes = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets',
  ];

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  if (state) {
    url.searchParams.set('state', state);
  }
  return url.toString();
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
      return;
    }

    const state = readState(req);
    const authUrl = buildAuthUrl(state);
    res.status(200).json({ authUrl });
  } catch (error) {
    console.error('[api/auth/google/url] unhandled error', error);
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
