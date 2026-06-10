import { prisma } from '../db/prisma.js';
import { loadOAuthClientForUser } from '../auth/google-auth-service.js';
import { appendSheetRow } from './google-sheets-service.js';

const withSpreadsheetContext = async (
  userId: string,
  callback: (params: { auth: NonNullable<Awaited<ReturnType<typeof loadOAuthClientForUser>>>; spreadsheetId: string }) => Promise<void>
) => {
  const context = await prisma.userDriveContext.findUnique({
    where: { userId },
  });
  if (!context?.masterSpreadsheetId) return;
  const auth = await loadOAuthClientForUser(userId);
  if (!auth) return;
  await callback({
    auth,
    spreadsheetId: context.masterSpreadsheetId,
  });
};

export const syncClientToSheet = async (params: {
  ownerUserId: string;
  clientId: string;
  nome: string;
  descricao?: string | null;
  responsavel?: string | null;
  observacoes?: string | null;
  createdBy: string;
}) => {
  await withSpreadsheetContext(params.ownerUserId, async ({ auth, spreadsheetId }) => {
    await appendSheetRow({
      auth,
      spreadsheetId,
      sheetName: 'CLIENTES',
      row: {
        client_id: params.clientId,
        nome: params.nome,
        descricao: params.descricao || '',
        responsavel: params.responsavel || '',
        observacoes: params.observacoes || '',
        owner_user_id: params.ownerUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: params.createdBy,
      },
    });
  });
};

export const syncProjectToSheet = async (params: {
  ownerUserId: string;
  projectId: string;
  clientId: string;
  nome: string;
  objetivo: string;
  metodologia: string;
  status: string;
  startDate?: string;
  endDate?: string;
  responsible?: string;
  folderId?: string;
  visibility: string;
  createdBy: string;
}) => {
  await withSpreadsheetContext(params.ownerUserId, async ({ auth, spreadsheetId }) => {
    await appendSheetRow({
      auth,
      spreadsheetId,
      sheetName: 'PROJETOS',
      row: {
        project_id: params.projectId,
        client_id: params.clientId,
        nome: params.nome,
        objetivo: params.objetivo,
        metodologia: params.metodologia,
        status: params.status,
        start_date: params.startDate || '',
        end_date: params.endDate || '',
        responsible: params.responsible || '',
        folder_id: params.folderId || '',
        owner_user_id: params.ownerUserId,
        visibility: params.visibility,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: params.createdBy,
      },
    });
  });
};

export const syncProjectMemberToSheet = async (params: {
  ownerUserId: string;
  id: string;
  projectId: string;
  userId?: string | null;
  email: string;
  role: string;
  permissionLevel: string;
  invitedBy: string;
  invitedAt: Date;
  acceptedAt?: Date | null;
  status: string;
}) => {
  await withSpreadsheetContext(params.ownerUserId, async ({ auth, spreadsheetId }) => {
    await appendSheetRow({
      auth,
      spreadsheetId,
      sheetName: 'PROJECT_MEMBERS',
      row: {
        id: params.id,
        project_id: params.projectId,
        user_id: params.userId || '',
        email: params.email,
        role: params.role,
        permission_level: params.permissionLevel,
        invited_by: params.invitedBy,
        invited_at: params.invitedAt.toISOString(),
        accepted_at: params.acceptedAt?.toISOString() || '',
        status: params.status,
      },
    });
  });
};

export const syncShareToSheet = async (params: {
  ownerUserId: string;
  id: string;
  entityType: string;
  entityId: string;
  sharedWithUserId?: string | null;
  sharedWithEmail: string;
  role: string;
  permissionLevel: string;
  shareType: string;
  createdBy: string;
  status: string;
}) => {
  await withSpreadsheetContext(params.ownerUserId, async ({ auth, spreadsheetId }) => {
    await appendSheetRow({
      auth,
      spreadsheetId,
      sheetName: 'SHARES',
      row: {
        id: params.id,
        entity_type: params.entityType,
        entity_id: params.entityId,
        owner_user_id: params.ownerUserId,
        shared_with_user_id: params.sharedWithUserId || '',
        shared_with_email: params.sharedWithEmail,
        role: params.role,
        permission_level: params.permissionLevel,
        share_type: params.shareType,
        created_at: new Date().toISOString(),
        created_by: params.createdBy,
        status: params.status,
      },
    });
  });
};

export const syncArtifactToSheet = async (params: {
  ownerUserId: string;
  artifactId: string;
  projectId: string;
  nome: string;
  tipo: string;
  escopo: string;
  formato: string;
  link?: string | null;
  driveFileId?: string | null;
  status: string;
  versaoAtual: number;
  updatedBy: string;
}) => {
  await withSpreadsheetContext(params.ownerUserId, async ({ auth, spreadsheetId }) => {
    await appendSheetRow({
      auth,
      spreadsheetId,
      sheetName: 'ARTEFATOS',
      row: {
        artifact_id: params.artifactId,
        project_id: params.projectId,
        nome: params.nome,
        tipo: params.tipo,
        escopo: params.escopo,
        formato: params.formato,
        link: params.link || '',
        drive_file_id: params.driveFileId || '',
        status: params.status,
        versao_atual: String(params.versaoAtual),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: params.updatedBy,
      },
    });
  });
};

