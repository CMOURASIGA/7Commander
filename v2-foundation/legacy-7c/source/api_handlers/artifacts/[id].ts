import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { withApiHandler, json, parseBody, ApiError } from '../../backend/http/api-handler.js';
import { requireAuthContext } from '../../backend/auth/auth-context.js';
import { prisma } from '../../backend/db/prisma.js';
import { requireProjectEdit } from '../../backend/services/authorization-service.js';
import { recordAuditEvent } from '../../backend/services/audit-service.js';
import { syncArtifactToSheet } from '../../backend/services/sheets-sync-service.js';

const updateArtifactSchema = z.object({
  name: z.string().min(2).max(180).optional(),
  type: z.string().min(2).max(80).optional(),
  scope: z.string().min(2).max(80).optional(),
  format: z.string().min(2).max(80).optional(),
  link: z.string().url().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'FINAL', 'ARCHIVED']).optional(),
  content: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional(),
  note: z.string().max(500).optional(),
});

async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuthContext(req);
  const artifactId = String(req.query.id || '');
  if (!artifactId) throw new ApiError(400, 'Artifact id is required');

  const artifact = await prisma.artifact.findUnique({
    where: { id: artifactId },
    include: { project: true },
  });
  if (!artifact) throw new ApiError(404, 'Artifact not found', 'ARTIFACT_NOT_FOUND');

  await requireProjectEdit(artifact.projectId, auth.userId, auth.email);

  if (req.method === 'PUT') {
    const body = updateArtifactSchema.parse(parseBody(req));
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const next = await tx.artifact.update({
        where: { id: artifactId },
        data: {
          name: body.name?.trim(),
          type: body.type?.trim(),
          scope: body.scope?.trim(),
          format: body.format?.trim(),
          link: body.link === null ? null : body.link || undefined,
          status: body.status,
          content: body.content,
          metadataJson: (body.metadata as Prisma.InputJsonValue) || undefined,
          updatedBy: auth.email,
        },
      });

      if (body.content !== undefined) {
        await tx.artifactVersion.updateMany({
          where: {
            artifactId,
            version: artifact.currentVersion,
          },
          data: {
            content: body.content,
            note: body.note || undefined,
          },
        });
      }
      return next;
    });

    await recordAuditEvent({
      actorUserId: auth.userId,
      projectId: artifact.projectId,
      entityType: 'ARTIFACT',
      entityId: artifactId,
      action: 'ARTIFACT_UPDATED',
      summary: `Artefato atualizado: ${updated.name} v${updated.currentVersion}`,
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
    return;
  }

  if (req.method === 'DELETE') {
    await prisma.artifact.delete({
      where: { id: artifactId },
    });
    await recordAuditEvent({
      actorUserId: auth.userId,
      projectId: artifact.projectId,
      entityType: 'ARTIFACT',
      entityId: artifactId,
      action: 'ARTIFACT_DELETED',
      summary: `Artefato removido: ${artifact.name}`,
    });
    json(res, 200, { ok: true });
  }
}

export default withApiHandler(handler, {
  methods: ['PUT', 'DELETE'],
});
