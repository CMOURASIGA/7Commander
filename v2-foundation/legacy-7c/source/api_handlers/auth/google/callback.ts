import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  exchangeCodeForTokens,
  readGoogleProfile,
  upsertGoogleCredentials,
  upsertUserFromGoogle,
} from '../../../backend/auth/google-auth-service.js';
import { createSession, setSessionCookie } from '../../../backend/auth/session-service.js';
import { env } from '../../../backend/config/env.js';
import { ensureUserProvisioning } from '../../../backend/services/provisioning-service.js';
import { withApiHandler, parseBody, json, ApiError } from '../../../backend/http/api-handler.js';

const bodySchema = z.object({
  code: z.string().min(10),
});

const readCodeFromRequest = (req: VercelRequest): string => {
  if (req.method === 'GET') {
    const queryCode = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
    return z.string().min(10).parse(queryCode);
  }
  const body = bodySchema.parse(parseBody(req));
  return body.code;
};

async function handler(req: VercelRequest, res: VercelResponse) {
  const code = readCodeFromRequest(req);
  const { client, tokens } = await exchangeCodeForTokens(code);
  const profile = await readGoogleProfile(client);
  const user = await upsertUserFromGoogle(profile);
  await upsertGoogleCredentials(user.id, tokens);

  if (!tokens.access_token && !tokens.refresh_token) {
    throw new ApiError(401, 'Google authorization did not return usable tokens', 'GOOGLE_AUTH_FAILED');
  }

  const context = await ensureUserProvisioning({
    userId: user.id,
    googleSub: profile.googleSub,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    auth: client,
  });

  const session = await createSession(user.id);
  setSessionCookie(res, session.rawToken, session.expiresAt);

  if (req.method === 'GET') {
    const location = env.frontendUrl || 'http://localhost:5173';
    res.setHeader('Location', location);
    res.status(302).end();
    return;
  }

  json(res, 200, {
    user: {
      id: user.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    },
    workspace: {
      rootFolderId: context.rootFolderId,
      masterSpreadsheetId: context.masterSpreadsheetId,
      projectsFolderId: context.projectsFolderId,
    },
  });
}

export default withApiHandler(handler, {
  methods: ['GET', 'POST'],
});

