import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, json, ApiError } from '../../backend/http/api-handler.js';
import { requireAuthContext } from '../../backend/auth/auth-context.js';
import { loadOAuthClientForUser } from '../../backend/auth/google-auth-service.js';
import { ensureUserProvisioning } from '../../backend/services/provisioning-service.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuthContext(req);
  const oauthClient = await loadOAuthClientForUser(auth.userId);
  if (!oauthClient) {
    throw new ApiError(400, 'Google credentials not found for this user', 'GOOGLE_CREDENTIALS_NOT_FOUND');
  }

  const context = await ensureUserProvisioning({
    userId: auth.userId,
    googleSub: auth.user.googleSub,
    email: auth.user.email,
    name: auth.user.name,
    picture: auth.user.picture,
    auth: oauthClient,
  });

  json(res, 200, {
    ok: true,
    context,
  });
}

export default withApiHandler(handler, {
  methods: ['POST'],
});

