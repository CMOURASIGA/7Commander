import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, json } from '../../backend/http/api-handler.js';
import { getSessionFromRequest } from '../../backend/auth/session-service.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    json(res, 401, {
      authenticated: false,
    });
    return;
  }

  json(res, 200, {
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
}

export default withApiHandler(handler, {
  methods: ['GET'],
});

