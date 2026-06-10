import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { withApiHandler, json, parseBody, ApiError } from '../../../backend/http/api-handler.js';
import { requireAuthContext } from '../../../backend/auth/auth-context.js';
import { prisma } from '../../../backend/db/prisma.js';
import { requireProjectEdit } from '../../../backend/services/authorization-service.js';
import { recordAuditEvent } from '../../../backend/services/audit-service.js';
import { syncArtifactToSheet } from '../../../backend/services/sheets-sync-service.js';

const bodySchema = z.object({
  content: z.string().min(1),
  note: z.string().max(500).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'FINAL', 'ARCHIVED']).optional(),
  link: z.string().url().optional().nullable(),
});

async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuthContext(req);
  const artifactId = String(req.query.id || '');
  if (!artifactId) throw new ApiError(400, 'Artifact id is required');

  const body = bodySchema.parse(parseBody(req));
  const artifact = await prisma.artifact.findUnique({
    where: { id: artifactId },
    include: { project: true },
  });
  if (!artifact) throw new ApiError(404, 'Artifact not found', 'ARTIFACT_NOT_FOUND');

  await requireProjectEdit(artifact.projectId, auth.userId, auth.email);
  const newVersion = artifact.currentVersion + 1;

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const next = await tx.artifact.update({
      where: { id: artifactId },
      data: {
        currentVersion: newVersion,
        content: body.content,
        status: body.status || artifact.status,
        link: body.link === null ? null : body.link || artifact.link,
        updatedBy: auth.email,
      },
    });

    await tx.artifactVersion.create({
      data: {
        artifactId,
        version: newVersion,
        content: body.content,
        note: body.note || `Nova versao v${newVersion}`,
        createdBy: auth.email,
      },
    });
    return next;
  });

  await recordAuditEvent({
    actorUserId: auth.userId,
    projectId: artifact.projectId,
    entityType: 'ARTIFACT',
    entityId: artifactId,
    action: 'ARTIFACT_VERSION_CREATED',
    summary: `Nova versao criada: ${artifact.name} v${newVersion}`,
  });

  await syncArtifactToSheet({
    ownerUserId: artifact.project.ownerUserId,
    artifactId: updated.id,
    projectId: updated.projectId,
    nome: updated.name,
    tipo: updated.type,
    escopo: updated.scope,
    formato: updated.format,
    link: updated.link,
    driveFileId: updated.driveFileId,
    status: updated.status,
    versaoAtual: updated.currentVersion,
    updatedBy: auth.email,
  });

  json(res, 200, { artifact: updated });
}

export default withApiHandler(handler, {
  methods: ['POST'],
});
