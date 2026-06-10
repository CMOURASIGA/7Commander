import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';

export const recordAuditEvent = async (params: {
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}) => {
  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      summary: params.summary,
      projectId: params.projectId,
      metadataJson: (params.metadata as Prisma.InputJsonValue) || undefined,
    },
  });
};

