import { prisma } from '../db/prisma.js';
import { ensureRootDriveStructure } from './google-drive-service.js';
import { appendSheetRow, ensureMasterSpreadsheet } from './google-sheets-service.js';

export const ensureUserProvisioning = async (params: {
  userId: string;
  googleSub: string;
  email: string;
  name: string;
  picture?: string | null;
  auth: any;
}) => {
  const existing = await prisma.userDriveContext.findUnique({
    where: { userId: params.userId },
  });

  if (existing) {
    return existing;
  }

  const driveStructure = await ensureRootDriveStructure(params.auth);
  const masterSheet = await ensureMasterSpreadsheet({
    auth: params.auth,
    controlFolderId: driveStructure.controlFolderId,
  });

  const context = await prisma.userDriveContext.create({
    data: {
      userId: params.userId,
      rootFolderId: driveStructure.rootFolderId,
      rootFolderName: 'PM Command Center',
      masterSpreadsheetId: masterSheet.spreadsheetId,
      masterSpreadsheetName: masterSheet.spreadsheetName,
      controlFolderId: driveStructure.controlFolderId,
      clientsFolderId: driveStructure.clientsFolderId,
      projectsFolderId: driveStructure.projectsFolderId,
      artifactsFolderId: driveStructure.artifactsFolderId,
      exportsFolderId: driveStructure.exportsFolderId,
    },
  });

  await appendSheetRow({
    auth: params.auth,
    spreadsheetId: masterSheet.spreadsheetId,
    sheetName: 'USUARIOS',
    row: {
      user_id: params.userId,
      google_sub: params.googleSub,
      nome: params.name,
      email: params.email,
      picture: params.picture || '',
      root_folder_id: driveStructure.rootFolderId,
      spreadsheet_id: masterSheet.spreadsheetId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });

  return context;
};

