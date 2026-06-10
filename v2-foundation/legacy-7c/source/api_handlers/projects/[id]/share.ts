import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PermissionLevel, ProjectRole, ShareEntityType, ShareType } from '@prisma/client';
import { z } from 'zod';
import { withApiHandler, json, parseBody, ApiError } from '../../../backend/http/api-handler.js';
import { requireAuthContext } from '../../../backend/auth/auth-context.js';
import { requireProjectOwner } from '../../../backend/services/authorization-service.js';
import { prisma } from '../../../backend/db/prisma.js';
import { recordAuditEvent } from '../../../backend/services/audit-service.js';
import { syncProjectMemberToSheet, syncShareToSheet } from '../../../backend/services/sheets-sync-service.js';
import { loadOAuthClientForUser } from '../../../backend/auth/google-auth-service.js';
import { shareDriveFolder } from '../../../backend/services/google-drive-service.js';

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']).default('VIEWER'),
  permissionLevel: z.enum(['MANAGE', 'EDIT', 'VIEW']).optional(),
  shareDriveFolder: z.boolean().optional(),
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
  if (!projectId) {
    throw new ApiError(400, 'Project id is required');
  }

  const access = await requireProjectOwner(projectId, auth.userId, auth.email);
  const body = bodySchema.parse(parseBody(req));
  const email = body.email.toLowerCase();

  const sharedUser = await prisma.user.findUnique({
    where: { email },
  });

  const member = await prisma.projectMember.upsert({
    where: {
      projectId_email: {
        projectId,
        email,
      },
    },
    update: {
      role: body.role,
      permissionLevel: resolvePermissionLevel(body.role, body.permissionLevel),
      userId: sharedUser?.id || null,
      status: sharedUser ? 'ACTIVE' : 'PENDING',
      acceptedAt: sharedUser ? new Date() : null,
      invitedBy: auth.email,
    },
    create: {
      projectId,
      userId: sharedUser?.id || null,
      email,
      role: body.role,
      permissionLevel: resolvePermissionLevel(body.role, body.permissionLevel),
      status: sharedUser ? 'ACTIVE' : 'PENDING',
      invitedBy: auth.email,
      acceptedAt: sharedUser ? new Date() : null,
    },
  });

  const share = await prisma.share.create({
    data: {
      entityType: ShareEntityType.PROJECT,
      entityId: projectId,
      projectId,
      ownerUserId: auth.userId,
      sharedWithUserId: sharedUser?.id || null,
      sharedWithEmail: email,
      role: body.role,
      permissionLevel: resolvePermissionLevel(body.role, body.permissionLevel),
      shareType: sharedUser ? ShareType.INTERNAL_USER : ShareType.EMAIL_INVITE,
      status: 'ACTIVE',
    },
  });

  await recordAuditEvent({
    actorUserId: auth.userId,
    projectId,
    entityType: 'PROJECT_SHARE',
    entityId: share.id,
    action: 'PROJECT_SHARED',
    summary: `Projeto compartilhado com ${email} (${body.role})`,
    metadata: {
      email,
      role: body.role,
    },
  });

  await syncProjectMemberToSheet({
    ownerUserId: auth.userId,
    id: member.id,
    projectId,
    userId: member.userId,
    email: member.email,
    role: member.role,
    permissionLevel: member.permissionLevel,
    invitedBy: member.invitedBy,
    invitedAt: member.invitedAt,
    acceptedAt: member.acceptedAt,
    status: member.status,
  });

  await syncShareToSheet({
    ownerUserId: auth.userId,
    id: share.id,
    entityType: share.entityType,
    entityId: share.entityId,
    sharedWithUserId: share.sharedWithUserId,
    sharedWithEmail: share.sharedWithEmail,
    role: share.role,
    permissionLevel: share.permissionLevel,
    shareType: share.shareType,
    createdBy: auth.email,
    status: share.status,
  });

  if (body.shareDriveFolder && access.project.folderId) {
    const oauth = await loadOAuthClientForUser(auth.userId);
    if (oauth) {
      await shareDriveFolder({
        auth: oauth,
        folderId: access.project.folderId,
        email,
        role: body.role,
      });
    }
  }

  json(res, 201, { member, share });
}

export default withApiHandler(handler, {
  methods: ['POST'],
});
