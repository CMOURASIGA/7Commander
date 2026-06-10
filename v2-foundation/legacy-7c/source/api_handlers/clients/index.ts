import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { withApiHandler, json, parseBody } from '../../backend/http/api-handler.js';
import { requireAuthContext } from '../../backend/auth/auth-context.js';
import { prisma } from '../../backend/db/prisma.js';
import { recordAuditEvent } from '../../backend/services/audit-service.js';
import { decodeClientFields, encodeClientFields } from '../../backend/services/client-fields-service.js';
import { syncClientToSheet } from '../../backend/services/sheets-sync-service.js';

const createClientSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
  owner: z.string().max(150).optional(),
  notes: z.string().max(1000).optional(),
});

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuthContext(req);

  if (req.method === 'GET') {
    const clients = await prisma.client.findMany({
      where: {
        ownerUserId: auth.userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    json(res, 200, {
      clients: clients.map((client) => {
        const fields = decodeClientFields(client.description);
        return {
          ...client,
          description: fields.description,
          owner: fields.owner,
          notes: fields.notes,
        };
      }),
    });
    return;
  }

  if (req.method === 'POST') {
    const body = createClientSchema.parse(parseBody(req));
    const encodedDescription = encodeClientFields({
      description: body.description,
      owner: body.owner,
      notes: body.notes,
    });

    const created = await prisma.client.create({
      data: {
        ownerUserId: auth.userId,
        name: body.name.trim(),
        description: encodedDescription,
      },
    });

    const parsedFields = decodeClientFields(created.description);
    const clientResponse = {
      ...created,
      description: parsedFields.description,
      owner: parsedFields.owner,
      notes: parsedFields.notes,
    };

    try {
      await recordAuditEvent({
        actorUserId: auth.userId,
        entityType: 'CLIENT',
        entityId: created.id,
        action: 'CLIENT_CREATED',
        summary: `Cliente criado: ${created.name}`,
      });
    } catch (error) {
      console.error('[clients][POST] failed to record audit event', {
        clientId: created.id,
        userId: auth.userId,
        error,
      });
    }

    try {
      await withTimeout(
        syncClientToSheet({
          ownerUserId: auth.userId,
          clientId: created.id,
          nome: created.name,
          descricao: parsedFields.description,
          responsavel: parsedFields.owner,
          observacoes: parsedFields.notes,
          createdBy: auth.email,
        }),
        8000,
        'syncClientToSheet'
      );
    } catch (error) {
      console.error('[clients][POST] failed to sync client to sheet', {
        clientId: created.id,
        userId: auth.userId,
        error,
      });
    }

    json(res, 201, { client: clientResponse });
    return;
  }
}

export default withApiHandler(handler, {
  methods: ['GET', 'POST'],
});

