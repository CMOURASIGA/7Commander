import type { VercelRequest } from '@vercel/node';
import { requireSession } from './session-service.js';

export const requireAuthContext = async (req: VercelRequest) => {
  const session = await requireSession(req);
  return {
    sessionId: session.id,
    userId: session.userId,
    email: session.user.email.toLowerCase(),
    user: session.user,
    driveContext: session.user.driveContext,
  };
};

