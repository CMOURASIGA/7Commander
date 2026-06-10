import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { buildGoogleAuthUrl } from '../../../backend/auth/google-auth-service.js';
import { withApiHandler, parseBody, json } from '../../../backend/http/api-handler.js';

const bodySchema = z
  .object({
    state: z.string().min(1).max(200).optional(),
  })
  .optional();

async function handler(req: VercelRequest, res: VercelResponse) {
  const body = bodySchema.parse(parseBody(req));
  const authUrl = buildGoogleAuthUrl(body?.state);
  json(res, 200, {
    authUrl,
  });
}

export default withApiHandler(handler, {
  methods: ['GET', 'POST'],
});

