import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, json } from '../backend/http/api-handler.js';

async function handler(_req: VercelRequest, res: VercelResponse) {
  json(res, 200, {
    ok: true,
    service: 'pm-command-center-api',
    timestamp: new Date().toISOString(),
  });
}

export default withApiHandler(handler, {
  methods: ['GET'],
});

