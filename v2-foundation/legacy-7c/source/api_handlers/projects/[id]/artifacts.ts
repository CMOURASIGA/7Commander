import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { withApiHandler, json, parseBody, ApiError } from '../../../backend/http/api-handler.js';
import { requireAuthContext } from '../../../backend/auth/auth-context.js';
import { requireProjectEdit, requireProjectView } from '../../../backend/services/authorization-service.js';
import { prisma } from '../../../backend/db/prisma.js';
import { recordAuditEvent } from '../../../backend/services/audit-service.js';
import { syncArtifactToSheet } from '../../../backend/services/sheets-sync-service.js';

const createArtifactSchema = z.object({
  name: z.string().min(2).max(180),
  type: z.string().min(2).max(80),
  scope: z.string().min(2).max(80),
  format: z.string().min(2).max(80),
  link: z.string().url().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'FINAL', 'ARCHIVED']).default('DRAFT'),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  note: z.string().max(500).optional(),
});

async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuthContext(req);
  const projectId = String(req.query.id || '');
  if (!projectId) {
    throw new ApiError(400, 'Project id is required');
  }

  if (req.method === 'GET') {
    await requireProjectView(projectId, auth.userId, auth.email);
    const artifacts = await prisma.artifact.findMany({
      where: { projectId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    json(res, 200, { artifacts });
    return;
  }

  if (req.method === 'POST') {
    const access = await requireProjectEdit(projectId, auth.userId, auth.email);
    const body = createArtifactSchema.parse(parseBody(req));

    const artifact = await prisma.artifact.create({
      data: {
        projectId,
        name: body.name.trim(),
        type: body.type.trim(),
        scope: body.scope.trim(),
        format: body.format.trim(),
        link: body.link || null,
        status: body.status,
        currentVersion: 1,
        content: body.content,
        metadataJson: (body.metadata as Prisma.InputJsonValue) || undefined,
        createdBy: auth.email,
        updatedBy: auth.email,
        versions: {
          create: {
            version: 1,
            content: body.content,
            note: body.note || 'Versao inicial',
            createdBy: auth.email,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    await recordAuditEvent({
      actorUserId: auth.userId,
      projectId,
      entityType: 'ARTIFACT',
      entityId: artifact.id,
      action: 'ARTIFACT_CREATED',
      summary: `Artefato criado: ${artifact.name} v1`,
    });

    await syncArtifactToSheet({
      ownerUserId: access.project.ownerUserId,
      artifactId: artifact.id,
      projectId: artifact.projectId,
      nome: artifact.name,
      tipo: artifact.type,
      escopo: artifact.scope,
      formato: artifact.format,
      link: artifact.link,
      driveFileId: artifact.driveFileId,
      status: artifact.status,
      versaoAtual: artifact.currentVersion,
      updatedBy: auth.email,
    });

    json(res, 201, { artifact });
  }
}

export default withApiHandler(handler, {
  methods: ['GET', 'POST'],
});
