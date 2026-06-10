import { google } from 'googleapis';
import { env } from '../config/env.js';
import type { GoogleOAuthClient } from '../auth/google-auth-service.js';

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

export interface RootDriveStructure {
  rootFolderId: string;
  controlFolderId: string;
  clientsFolderId: string;
  projectsFolderId: string;
  artifactsFolderId: string;
  exportsFolderId: string;
}

const getDrive = (auth: GoogleOAuthClient) =>
  google.drive({
    version: 'v3',
    auth,
  });

const findFolder = async (
  auth: GoogleOAuthClient,
  name: string,
  parentId?: string
) => {
  const drive = getDrive(auth);
  const conditions = [
    `mimeType='${FOLDER_MIME_TYPE}'`,
    `name='${name.replace(/'/g, "\\'")}'`,
    'trashed=false',
  ];
  if (parentId) {
    conditions.push(`'${parentId}' in parents`);
  }
  const query = conditions.join(' and ');

  const response = await drive.files.list({
    q: query,
    fields: 'files(id,name,webViewLink)',
    pageSize: 1,
    spaces: 'drive',
  });

  return response.data.files?.[0] || null;
};

const createFolder = async (
  auth: GoogleOAuthClient,
  name: string,
  parentId?: string
) => {
  const drive = getDrive(auth);
  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME_TYPE,
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id,name,webViewLink',
  });

  if (!response.data.id) {
    throw new Error(`Unable to create folder: ${name}`);
  }

  return response.data;
};

const ensureFolder = async (
  auth: GoogleOAuthClient,
  name: string,
  parentId?: string
) => {
  const found = await findFolder(auth, name, parentId);
  if (found?.id) {
    return found.id;
  }
  const created = await createFolder(auth, name, parentId);
  return created.id!;
};

export const ensureRootDriveStructure = async (
  auth: GoogleOAuthClient
): Promise<RootDriveStructure> => {
  const rootFolderId = await ensureFolder(auth, env.driveRootFolderName);
  const controlFolderId = await ensureFolder(auth, '00_CONTROLE', rootFolderId);
  const clientsFolderId = await ensureFolder(auth, 'CLIENTES', rootFolderId);
  const projectsFolderId = await ensureFolder(auth, 'PROJETOS', rootFolderId);
  const artifactsFolderId = await ensureFolder(auth, 'ARTEFATOS', rootFolderId);
  const exportsFolderId = await ensureFolder(auth, 'EXPORTS', rootFolderId);

  return {
    rootFolderId,
    controlFolderId,
    clientsFolderId,
    projectsFolderId,
    artifactsFolderId,
    exportsFolderId,
  };
};

const normalizeSegment = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 120) || 'item';

export const ensureProjectFolderStructure = async (params: {
  auth: GoogleOAuthClient;
  projectsFolderId: string;
  clientName: string;
  projectName: string;
}) => {
  const { auth, projectsFolderId, clientName, projectName } = params;
  const projectFolderName = `${normalizeSegment(clientName)}_${normalizeSegment(projectName)}`;
  const projectFolderId = await ensureFolder(auth, projectFolderName, projectsFolderId);

  await Promise.all([
    ensureFolder(auth, 'CONTEXTO', projectFolderId),
    ensureFolder(auth, 'SAI', projectFolderId),
    ensureFolder(auth, 'PM', projectFolderId),
    ensureFolder(auth, 'BPMN', projectFolderId),
    ensureFolder(auth, 'STATUS', projectFolderId),
    ensureFolder(auth, 'GERAIS', projectFolderId),
  ]);

  const drive = getDrive(auth);
  const metadata = await drive.files.get({
    fileId: projectFolderId,
    fields: 'id,webViewLink',
  });

  return {
    projectFolderId,
    projectFolderUrl: metadata.data.webViewLink || null,
  };
};

const roleToDriveRole = (role: 'OWNER' | 'EDITOR' | 'VIEWER') => {
  if (role === 'OWNER') return 'owner';
  if (role === 'EDITOR') return 'writer';
  return 'reader';
};

export const shareDriveFolder = async (params: {
  auth: GoogleOAuthClient;
  folderId: string;
  email: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
}) => {
  const drive = getDrive(params.auth);
  await drive.permissions.create({
    fileId: params.folderId,
    requestBody: {
      type: 'user',
      role: roleToDriveRole(params.role),
      emailAddress: params.email,
    },
    sendNotificationEmail: false,
  });
};

export const revokeDriveFolderShare = async (params: {
  auth: GoogleOAuthClient;
  folderId: string;
  email: string;
}) => {
  const drive = getDrive(params.auth);
  const permissions = await drive.permissions.list({
    fileId: params.folderId,
    fields: 'permissions(id,emailAddress)',
  });
  const permission = permissions.data.permissions?.find(
    (item) => item.emailAddress?.toLowerCase() === params.email.toLowerCase()
  );
  if (!permission?.id) return;
  await drive.permissions.delete({
    fileId: params.folderId,
    permissionId: permission.id,
  });
};

