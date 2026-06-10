import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, json } from '../../backend/http/api-handler.js';
import { requireAuthContext } from '../../backend/auth/auth-context.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuthContext(req);
  json(res, 200, {
    userId: auth.userId,
    context: auth.driveContext || null,
  });
}

export default withApiHandler(handler, {
  methods: ['GET'],
});

