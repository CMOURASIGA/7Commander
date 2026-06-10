import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { withApiHandler, json, parseBody, ApiError } from '../../backend/http/api-handler.js';
import { requireAuthContext } from '../../backend/auth/auth-context.js';
import { prisma } from '../../backend/db/prisma.js';
import { recordAuditEvent } from '../../backend/services/audit-service.js';
import { decodeClientFields, encodeClientFields } from '../../backend/services/client-fields-service.js';

const updateClientSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional(),
  owner: z.string().max(150).optional(),
  notes: z.string().max(1000).optional(),
});

async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuthContext(req);
  const clientId = String(req.query.id || '');
  if (!clientId) {
    throw new ApiError(400, 'Client id is required');
  }

  const target = await prisma.client.findFirst({
    where: {
      id: clientId,
      ownerUserId: auth.userId,
    },
  });
  if (!target) {
    throw new ApiError(404, 'Client not found', 'CLIENT_NOT_FOUND');
  }

  if (req.method === 'PUT') {
    const body = updateClientSchema.parse(parseBody(req));
    const currentFields = decodeClientFields(target.description);
    const encodedDescription = encodeClientFields({
      description: body.description ?? currentFields.description,
      owner: body.owner ?? currentFields.owner,
      notes: body.notes ?? currentFields.notes,
    });

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        name: body.name?.trim(),
        description: encodedDescription,
      },
    });
    const parsedFields = decodeClientFields(updated.description);
    await recordAuditEvent({
      actorUserId: auth.userId,
      entityType: 'CLIENT',
      entityId: updated.id,
      action: 'CLIENT_UPDATED',
      summary: `Cliente atualizado: ${updated.name}`,
    });
    json(res, 200, {
      client: {
        ...updated,
        description: parsedFields.description,
        owner: parsedFields.owner,
        notes: parsedFields.notes,
      },
    });
    return;
  }

  if (req.method === 'DELETE') {
    const linkedProject = await prisma.project.findFirst({
      where: {
        clientId,
      },
      select: { id: true },
    });
    if (linkedProject) {
      throw new ApiError(
        409,
        'Cliente possui projetos vinculados. Exclua ou mova os projetos antes.',
        'CLIENT_HAS_PROJECTS'
      );
    }

    await prisma.client.delete({
      where: { id: clientId },
    });
    await recordAuditEvent({
      actorUserId: auth.userId,
      entityType: 'CLIENT',
      entityId: clientId,
      action: 'CLIENT_DELETED',
      summary: `Cliente removido: ${target.name}`,
    });
    json(res, 200, { ok: true });
  }
}

export default withApiHandler(handler, {
  methods: ['PUT', 'DELETE'],
});
