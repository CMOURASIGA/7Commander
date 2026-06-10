import type { VercelRequest, VercelResponse } from '@vercel/node';
import authGoogleUrlHandler from '../api_handlers/auth/google/url.js';
import authGoogleCallbackHandler from '../api_handlers/auth/google/callback.js';
import authLogoutHandler from '../api_handlers/auth/logout.js';
import authMeHandler from '../api_handlers/auth/me.js';
import clientsIndexHandler from '../api_handlers/clients/index.js';
import clientsByIdHandler from '../api_handlers/clients/[id].js';
import googleContextHandler from '../api_handlers/google/context.js';
import googleProvisionHandler from '../api_handlers/google/provision.js';
import projectsIndexHandler from '../api_handlers/projects/index.js';
import projectsByIdHandler from '../api_handlers/projects/[id].js';
import projectsArtifactsHandler from '../api_handlers/projects/[id]/artifacts.js';
import projectsHistoryHandler from '../api_handlers/projects/[id]/history.js';
import projectsShareHandler from '../api_handlers/projects/[id]/share.js';
import projectsMembersIndexHandler from '../api_handlers/projects/[id]/members/index.js';
import projectsMembersByIdHandler from '../api_handlers/projects/[id]/members/[memberId].js';
import artifactsByIdHandler from '../api_handlers/artifacts/[id].js';
import artifactsVersionHandler from '../api_handlers/artifacts/[id]/version.js';

type QueryValue = string | string[];
type Query = Record<string, QueryValue>;
type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const buildBaseQuery = (req: VercelRequest): Query => {
  const url = new URL(req.url || '/', 'http://localhost');
  const query: Query = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (query[key] === undefined) {
      query[key] = value;
      continue;
    }
    const current = query[key];
    if (Array.isArray(current)) {
      current.push(value);
      query[key] = current;
      continue;
    }
    query[key] = [current as string, value];
  }
  return query;
};

const assignQuery = (req: VercelRequest, params: Query = {}) => {
  (req as VercelRequest & { query: Query }).query = {
    ...buildBaseQuery(req),
    ...params,
  };
};

const routeToHandler = (routePath: string): { handler: RouteHandler; params?: Query } | null => {
  const route = routePath.replace(/^\/api\/?/, '').replace(/^\/+/, '');
  const segments = route.split('/').filter(Boolean).map(decodeURIComponent);

  if (segments.length === 1 && segments[0] === 'health') {
    return {
      handler: async (_req, res) => {
        res.status(200).json({
          ok: true,
          service: 'pm-command-center-api',
          timestamp: new Date().toISOString(),
        });
      },
    };
  }

  if (segments.length === 3 && segments[0] === 'auth' && segments[1] === 'google' && segments[2] === 'url') {
    return { handler: authGoogleUrlHandler };
  }
  if (segments.length === 3 && segments[0] === 'auth' && segments[1] === 'google' && segments[2] === 'callback') {
    return { handler: authGoogleCallbackHandler };
  }
  if (segments.length === 2 && segments[0] === 'auth' && segments[1] === 'logout') {
    return { handler: authLogoutHandler };
  }
  if (segments.length === 2 && segments[0] === 'auth' && segments[1] === 'me') {
    return { handler: authMeHandler };
  }

  if (segments.length === 1 && segments[0] === 'clients') {
    return { handler: clientsIndexHandler };
  }
  if (segments.length === 2 && segments[0] === 'clients') {
    return {
      handler: clientsByIdHandler,
      params: { id: segments[1] },
    };
  }

  if (segments.length === 2 && segments[0] === 'google' && segments[1] === 'context') {
    return { handler: googleContextHandler };
  }
  if (segments.length === 2 && segments[0] === 'google' && segments[1] === 'provision') {
    return { handler: googleProvisionHandler };
  }

  if (segments.length === 1 && segments[0] === 'projects') {
    return { handler: projectsIndexHandler };
  }
  if (segments.length === 2 && segments[0] === 'projects') {
    return {
      handler: projectsByIdHandler,
      params: { id: segments[1] },
    };
  }
  if (segments.length === 3 && segments[0] === 'projects' && segments[2] === 'artifacts') {
    return {
      handler: projectsArtifactsHandler,
      params: { id: segments[1] },
    };
  }
  if (segments.length === 3 && segments[0] === 'projects' && segments[2] === 'history') {
    return {
      handler: projectsHistoryHandler,
      params: { id: segments[1] },
    };
  }
  if (segments.length === 3 && segments[0] === 'projects' && segments[2] === 'share') {
    return {
      handler: projectsShareHandler,
      params: { id: segments[1] },
    };
  }
  if (segments.length === 3 && segments[0] === 'projects' && segments[2] === 'members') {
    return {
      handler: projectsMembersIndexHandler,
      params: { id: segments[1] },
    };
  }
  if (segments.length === 4 && segments[0] === 'projects' && segments[2] === 'members') {
    return {
      handler: projectsMembersByIdHandler,
      params: { id: segments[1], memberId: segments[3] },
    };
  }

  if (segments.length === 2 && segments[0] === 'artifacts') {
    return {
      handler: artifactsByIdHandler,
      params: { id: segments[1] },
    };
  }
  if (segments.length === 3 && segments[0] === 'artifacts' && segments[2] === 'version') {
    return {
      handler: artifactsVersionHandler,
      params: { id: segments[1] },
    };
  }

  return null;
};

const pickRouteQuery = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') return value[0];
  return null;
};

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    const url = new URL(req.url || '/', 'http://localhost');
    const routeFromQuery = pickRouteQuery(req.query?.route);
    const routePath = routeFromQuery ? `/api/${routeFromQuery}` : url.pathname;
    const mapped = routeToHandler(routePath);

    if (!mapped) {
      res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
      return;
    }

    assignQuery(req, mapped.params);
    await mapped.handler(req, res);
  } catch (error) {
    console.error('[api/index] unhandled error', error);
    const url = new URL(req.url || '/', 'http://localhost');
    const debugEnabled = url.searchParams.get('debug') === '1' || req.headers['x-debug-api'] === '1';
    const payload: Record<string, unknown> = {
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    };

    if (debugEnabled && error instanceof Error) {
      payload.debug = {
        name: error.name,
        message: error.message,
      };
    }

    res.status(500).json(payload);
  }
}

export default handler;

