import type { VercelRequest, VercelResponse } from '@vercel/node';
import { env } from '../config/env.js';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = 'API_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

interface HandlerOptions {
  methods?: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS'>;
  authRequired?: boolean;
}

export const json = (res: VercelResponse, status: number, payload: unknown) => {
  res.status(status).json(payload);
};

export const parseBody = <T>(req: VercelRequest): T => {
  if (!req.body) return {} as T;
  if (typeof req.body === 'string') return JSON.parse(req.body) as T;
  return req.body as T;
};

const isConfigurationError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return error.message.startsWith('Missing required environment variable:');
};

const isDatabaseUnavailableError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const name = (error as { name?: string }).name || '';
  const message = error.message || '';
  return (
    name === 'PrismaClientInitializationError' ||
    message.includes("Environment variable not found: DATABASE_URL") ||
    message.includes("Can't reach database server") ||
    message.includes('Error querying the database')
  );
};

const applyCors = (req: VercelRequest, res: VercelResponse) => {
  const normalizeOrigin = (value?: string) => {
    if (!value) return null;
    try {
      const parsed = new URL(value);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return null;
    }
  };

  const frontendOrigin = normalizeOrigin(env.frontendUrl) || 'http://localhost:5173';
  const requestOrigin = req.headers.origin;
  const allowOrigin = requestOrigin && requestOrigin === frontendOrigin ? requestOrigin : frontendOrigin;
  try {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  } catch (error) {
    console.error('[api] failed to set CORS origin header', { allowOrigin, error });
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
};

export const withApiHandler = (handler: ApiHandler, options: HandlerOptions = {}): ApiHandler => {
  return async (req, res) => {
    try {
      applyCors(req, res);

      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }

      if (options.methods && req.method && !options.methods.includes(req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS')) {
        json(res, 405, { error: 'Method not allowed' });
        return;
      }

      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        json(res, error.status, {
          error: error.message,
          code: error.code,
        });
        return;
      }

      if (isConfigurationError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'Server configuration error';
        const payload =
          env.nodeEnv === 'production'
            ? { error: 'Server configuration error', code: 'CONFIGURATION_ERROR' }
            : { error: errorMessage, code: 'CONFIGURATION_ERROR' };
        json(res, 500, payload);
        return;
      }

      if (isDatabaseUnavailableError(error)) {
        const payload =
          env.nodeEnv === 'production'
            ? { error: 'Database unavailable', code: 'DATABASE_UNAVAILABLE' }
            : {
                error:
                  error instanceof Error ? error.message : 'Database unavailable',
                code: 'DATABASE_UNAVAILABLE',
              };
        json(res, 503, payload);
        return;
      }

      console.error('[api] unhandled error', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      const payload =
        env.nodeEnv === 'production'
          ? { error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' }
          : { error: errorMessage, code: 'INTERNAL_SERVER_ERROR' };
      json(res, 500, payload);
    }
  };
};

