import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { withApiHandler, json, parseBody, ApiError } from '../../backend/http/api-handler.js';
import { requireAuthContext } from '../../backend/auth/auth-context.js';
import { prisma } from '../../backend/db/prisma.js';
import { requireProjectEdit, requireProjectOwner, requireProjectView } from '../../backend/services/authorization-service.js';
import { recordAuditEvent } from '../../backend/services/audit-service.js';
import { syncProjectToSheet } from '../../backend/services/sheets-sync-service.js';

const updateProjectSchema = z.object({
  name: z.string().min(2).max(180).optional(),
  description: z.string().max(1000).optional(),
  objective: z.string().min(2).max(500).optional(),
  methodology: z.string().min(2).max(100).optional(),
  status: z.string().min(2).max(100).optional(),
  visibility: z.enum(['PRIVATE', 'SHARED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  responsible: z.string().optional(),
  health: z.string().optional(),
  phase: z.string().optional(),
  nextStep: z.string().optional(),
  stakeholders: z.array(z.string()).optional(),
});

async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuthContext(req);
  const projectId = String(req.query.id || '');
  if (!projectId) {
    throw new ApiError(400, 'Project id is required');
  }

  if (req.method === 'GET') {
    await requireProjectView(projectId, auth.userId, auth.email);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
      },
    });
    if (!project) {
      throw new ApiError(404, 'Project not found', 'PROJECT_NOT_FOUND');
    }
    json(res, 200, { project });
    return;
  }

  if (req.method === 'PUT') {
    await requireProjectEdit(projectId, auth.userId, auth.email);
    const body = updateProjectSchema.parse(parseBody(req));
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: body.name?.trim(),
        description: body.description !== undefined ? body.description.trim() || null : undefined,
        objective: body.objective?.trim(),
        methodology: body.methodology?.trim(),
        status: body.status?.trim(),
        visibility: body.visibility,
        startDate: body.startDate,
        endDate: body.endDate,
        responsible: body.responsible?.trim() || undefined,
        health: body.health?.trim() || undefined,
        phase: body.phase?.trim() || undefined,
        nextStep: body.nextStep?.trim() || undefined,
        stakeholdersJson: body.stakeholders,
      },
    });
    await recordAuditEvent({
      actorUserId: auth.userId,
      projectId,
      entityType: 'PROJECT',
      entityId: projectId,
      action: 'PROJECT_UPDATED',
      summary: `Projeto atualizado: ${updated.name}`,
    });

    await syncProjectToSheet({
      ownerUserId: updated.ownerUserId,
      projectId: updated.id,
      clientId: updated.clientId,
      nome: updated.name,
      objetivo: updated.objective,
      metodologia: updated.methodology,
      status: updated.status,
      startDate: updated.startDate || undefined,
      endDate: updated.endDate || undefined,
      responsible: updated.responsible || undefined,
      folderId: updated.folderId || undefined,
      visibility: updated.visibility,
      createdBy: auth.email,
    });

    json(res, 200, { project: updated });
    return;
  }

  if (req.method === 'DELETE') {
    await requireProjectOwner(projectId, auth.userId, auth.email);
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!existing) {
      throw new ApiError(404, 'Project not found', 'PROJECT_NOT_FOUND');
    }
    await prisma.project.delete({
      where: { id: projectId },
    });
    await recordAuditEvent({
      actorUserId: auth.userId,
      projectId,
      entityType: 'PROJECT',
      entityId: projectId,
      action: 'PROJECT_DELETED',
      summary: `Projeto removido: ${existing.name}`,
    });
    json(res, 200, { ok: true });
  }
}

export default withApiHandler(handler, {
  methods: ['GET', 'PUT', 'DELETE'],
});
