import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PermissionLevel, ProjectRole } from '@prisma/client';
import { z } from 'zod';
import { withApiHandler, json, parseBody, ApiError } from '../../../../backend/http/api-handler.js';
import { requireAuthContext } from '../../../../backend/auth/auth-context.js';
import { requireProjectOwner } from '../../../../backend/services/authorization-service.js';
import { prisma } from '../../../../backend/db/prisma.js';
import { recordAuditEvent } from '../../../../backend/services/audit-service.js';
import { loadOAuthClientForUser } from '../../../../backend/auth/google-auth-service.js';
import { revokeDriveFolderShare } from '../../../../backend/services/google-drive-service.js';

const bodySchema = z.object({
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']),
  permissionLevel: z.enum(['MANAGE', 'EDIT', 'VIEW']).optional(),
});

const resolvePermissionLevel = (role: ProjectRole, explicit?: PermissionLevel) => {
  if (explicit) return explicit;
  if (role === 'OWNER') return PermissionLevel.MANAGE;
  if (role === 'EDITOR') return PermissionLevel.EDIT;
  return PermissionLevel.VIEW;
};

async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuthContext(req);
  const projectId = String(req.query.id || '');
  const memberId = String(req.query.memberId || '');
  if (!projectId || !memberId) {
    throw new ApiError(400, 'Project id and member id are required');
  }

  const access = await requireProjectOwner(projectId, auth.userId, auth.email);
  const target = await prisma.projectMember.findFirst({
    where: {
      id: memberId,
      projectId,
    },
  });
  if (!target) {
    throw new ApiError(404, 'Member not found', 'MEMBER_NOT_FOUND');
  }

  if (req.method === 'PUT') {
    const body = bodySchema.parse(parseBody(req));
    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: {
        role: body.role,
        permissionLevel: resolvePermissionLevel(body.role, body.permissionLevel),
      },
    });
    await prisma.share.updateMany({
      where: {
        projectId,
        sharedWithEmail: updated.email.toLowerCase(),
        status: 'ACTIVE',
      },
      data: {
        role: updated.role,
        permissionLevel: updated.permissionLevel,
      },
    });
    await recordAuditEvent({
      actorUserId: auth.userId,
      projectId,
      entityType: 'PROJECT_MEMBER',
      entityId: memberId,
      action: 'PROJECT_MEMBER_UPDATED',
      summary: `Membro atualizado: ${updated.email} (${updated.role})`,
    });
    json(res, 200, { member: updated });
    return;
  }

  if (req.method === 'DELETE') {
    await prisma.projectMember.update({
      where: { id: memberId },
      data: {
        status: 'REVOKED',
      },
    });
    await prisma.share.updateMany({
      where: {
        projectId,
        sharedWithEmail: target.email.toLowerCase(),
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
      },
    });

    if (access.project.folderId) {
      const oauth = await loadOAuthClientForUser(auth.userId);
      if (oauth) {
        await revokeDriveFolderShare({
          auth: oauth,
          folderId: access.project.folderId,
          email: target.email,
        }).catch(() => null);
      }
    }

    await recordAuditEvent({
      actorUserId: auth.userId,
      projectId,
      entityType: 'PROJECT_MEMBER',
      entityId: memberId,
      action: 'PROJECT_MEMBER_REVOKED',
      summary: `Compartilhamento revogado: ${target.email}`,
    });

    json(res, 200, { ok: true });
  }
}

export default withApiHandler(handler, {
  methods: ['PUT', 'DELETE'],
});
