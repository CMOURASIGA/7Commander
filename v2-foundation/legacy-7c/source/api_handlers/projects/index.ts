import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { withApiHandler, json, parseBody, ApiError } from '../../backend/http/api-handler.js';
import { requireAuthContext } from '../../backend/auth/auth-context.js';
import { prisma } from '../../backend/db/prisma.js';
import { recordAuditEvent } from '../../backend/services/audit-service.js';
import { loadOAuthClientForUser } from '../../backend/auth/google-auth-service.js';
import { ensureProjectFolderStructure } from '../../backend/services/google-drive-service.js';
import { syncProjectToSheet } from '../../backend/services/sheets-sync-service.js';

const createProjectSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(2).max(180),
  description: z.string().max(1000).optional(),
  objective: z.string().min(2).max(500),
  methodology: z.string().min(2).max(100),
  status: z.string().min(2).max(100),
  visibility: z.enum(['PRIVATE', 'SHARED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  responsible: z.string().optional(),
  health: z.string().optional(),
  phase: z.string().optional(),
  nextStep: z.string().optional(),
  stakeholders: z.array(z.string()).optional(),
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
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerUserId: auth.userId },
          {
            members: {
              some: {
                status: 'ACTIVE',
                OR: [{ userId: auth.userId }, { email: auth.email }],
              },
            },
          },
        ],
      },
      include: {
        client: true,
        members: {
          where: {
            status: 'ACTIVE',
            OR: [{ userId: auth.userId }, { email: auth.email }],
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    json(res, 200, {
      projects: projects.map((project) => ({
        ...project,
        accessRole:
          project.ownerUserId === auth.userId
            ? 'OWNER'
            : project.members[0]?.role || 'VIEWER',
        permissionLevel:
          project.ownerUserId === auth.userId
            ? 'MANAGE'
            : project.members[0]?.permissionLevel || 'VIEW',
      })),
    });
    return;
  }

  if (req.method === 'POST') {
    const body = createProjectSchema.parse(parseBody(req));
    const client = await prisma.client.findFirst({
      where: {
        id: body.clientId,
        ownerUserId: auth.userId,
      },
    });
    if (!client) {
      throw new ApiError(404, 'Client not found', 'CLIENT_NOT_FOUND');
    }

    let folder: { projectFolderId: string; projectFolderUrl: string | null } | null = null;
    const userDriveContext = await prisma.userDriveContext.findUnique({
      where: { userId: auth.userId },
    });
    const oauthClient = await loadOAuthClientForUser(auth.userId);

    if (userDriveContext?.projectsFolderId && oauthClient) {
      try {
        folder = await withTimeout(
          ensureProjectFolderStructure({
            auth: oauthClient,
            projectsFolderId: userDriveContext.projectsFolderId,
            clientName: client.name,
            projectName: body.name,
          }),
          10000,
          'ensureProjectFolderStructure'
        );
      } catch (error) {
        console.error('[projects][POST] failed to ensure drive folder structure', {
          userId: auth.userId,
          clientId: client.id,
          projectName: body.name,
          error,
        });
      }
    } else {
      console.warn('[projects][POST] skipping drive folder provisioning (missing context or credentials)', {
        userId: auth.userId,
        hasProjectsFolderId: Boolean(userDriveContext?.projectsFolderId),
        hasOAuthClient: Boolean(oauthClient),
      });
    }

    const created = await prisma.project.create({
      data: {
        clientId: client.id,
        ownerUserId: auth.userId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        objective: body.objective.trim(),
        methodology: body.methodology.trim(),
        status: body.status.trim(),
        visibility: body.visibility || 'PRIVATE',
        startDate: body.startDate,
        endDate: body.endDate,
        responsible: body.responsible?.trim() || null,
        health: body.health?.trim() || null,
        phase: body.phase?.trim() || null,
        nextStep: body.nextStep?.trim() || null,
        stakeholdersJson: body.stakeholders || [],
        folderId: folder?.projectFolderId || null,
        folderUrl: folder?.projectFolderUrl || null,
      },
    });

    try {
      await recordAuditEvent({
        actorUserId: auth.userId,
        projectId: created.id,
        entityType: 'PROJECT',
        entityId: created.id,
        action: 'PROJECT_CREATED',
        summary: `Projeto criado: ${created.name}`,
      });
    } catch (error) {
      console.error('[projects][POST] failed to record audit event', {
        projectId: created.id,
        userId: auth.userId,
        error,
      });
    }

    try {
      await withTimeout(
        syncProjectToSheet({
          ownerUserId: auth.userId,
          projectId: created.id,
          clientId: created.clientId,
          nome: created.name,
          objetivo: created.objective,
          metodologia: created.methodology,
          status: created.status,
          startDate: created.startDate || undefined,
          endDate: created.endDate || undefined,
          responsible: created.responsible || undefined,
          folderId: created.folderId || undefined,
          visibility: created.visibility,
          createdBy: auth.email,
        }),
        8000,
        'syncProjectToSheet'
      );
    } catch (error) {
      console.error('[projects][POST] failed to sync project to sheet', {
        projectId: created.id,
        userId: auth.userId,
        error,
      });
    }

    json(res, 201, { project: created });
    return;
  }
}

export default withApiHandler(handler, {
  methods: ['GET', 'POST'],
});

