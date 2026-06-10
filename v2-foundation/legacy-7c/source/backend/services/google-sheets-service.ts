import { google } from 'googleapis';
import { env } from '../config/env.js';
import type { GoogleOAuthClient } from '../auth/google-auth-service.js';

const SHEET_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';

const REQUIRED_SHEETS: Record<string, string[]> = {
  USUARIOS: [
    'user_id',
    'google_sub',
    'nome',
    'email',
    'picture',
    'root_folder_id',
    'spreadsheet_id',
    'created_at',
    'updated_at',
  ],
  CLIENTES: [
    'client_id',
    'nome',
    'descricao',
    'responsavel',
    'observacoes',
    'owner_user_id',
    'created_at',
    'updated_at',
    'created_by',
  ],
  PROJETOS: [
    'project_id',
    'client_id',
    'nome',
    'objetivo',
    'metodologia',
    'status',
    'start_date',
    'end_date',
    'responsible',
    'folder_id',
    'owner_user_id',
    'visibility',
    'created_at',
    'updated_at',
    'created_by',
  ],
  ARTEFATOS: [
    'artifact_id',
    'project_id',
    'nome',
    'tipo',
    'escopo',
    'formato',
    'link',
    'drive_file_id',
    'status',
    'versao_atual',
    'created_at',
    'updated_at',
    'updated_by',
  ],
  PROJECT_MEMBERS: [
    'id',
    'project_id',
    'user_id',
    'email',
    'role',
    'permission_level',
    'invited_by',
    'invited_at',
    'accepted_at',
    'status',
  ],
  SHARES: [
    'id',
    'entity_type',
    'entity_id',
    'owner_user_id',
    'shared_with_user_id',
    'shared_with_email',
    'role',
    'permission_level',
    'share_type',
    'created_at',
    'created_by',
    'status',
  ],
  HISTORICO: ['event_id', 'entity_type', 'entity_id', 'event_type', 'actor_user_id', 'actor_email', 'summary', 'metadata_json', 'created_at'],
  CONFIG: ['key', 'value'],
};

const getDrive = (auth: GoogleOAuthClient) =>
  google.drive({
    version: 'v3',
    auth,
  });

const getSheets = (auth: GoogleOAuthClient) =>
  google.sheets({
    version: 'v4',
    auth,
  });

const findSpreadsheet = async (
  auth: GoogleOAuthClient,
  sheetName: string,
  parentFolderId: string
) => {
  const drive = getDrive(auth);
  const escapedName = sheetName.replace(/'/g, "\\'");
  const query = [
    `mimeType='${SHEET_MIME_TYPE}'`,
    `name='${escapedName}'`,
    `'${parentFolderId}' in parents`,
    'trashed=false',
  ].join(' and ');
  const response = await drive.files.list({
    q: query,
    fields: 'files(id,name)',
    pageSize: 1,
  });
  return response.data.files?.[0] || null;
};

const createSpreadsheet = async (
  auth: GoogleOAuthClient,
  sheetName: string,
  parentFolderId: string
) => {
  const sheets = getSheets(auth);
  const drive = getDrive(auth);
  const createResponse = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: sheetName,
      },
    },
  });

  const spreadsheetId = createResponse.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('Unable to create spreadsheet');
  }

  await drive.files.update({
    fileId: spreadsheetId,
    addParents: parentFolderId,
    fields: 'id,parents',
  });

  return spreadsheetId;
};

const ensureSheetTabs = async (auth: GoogleOAuthClient, spreadsheetId: string) => {
  const sheets = getSheets(auth);
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))',
  });

  const existing = new Set(
    (metadata.data.sheets || []).map((sheet) => sheet.properties?.title).filter(Boolean) as string[]
  );

  const missing = Object.keys(REQUIRED_SHEETS).filter((title) => !existing.has(title));
  if (missing.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missing.map((title) => ({
          addSheet: { properties: { title } },
        })),
      },
    });
  }

  for (const [sheetName, headers] of Object.entries(REQUIRED_SHEETS)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });
  }
};

export const ensureMasterSpreadsheet = async (params: {
  auth: GoogleOAuthClient;
  controlFolderId: string;
}) => {
  const { auth, controlFolderId } = params;
  const found = await findSpreadsheet(auth, env.masterSheetName, controlFolderId);
  const spreadsheetId = found?.id || (await createSpreadsheet(auth, env.masterSheetName, controlFolderId));
  await ensureSheetTabs(auth, spreadsheetId);
  return {
    spreadsheetId,
    spreadsheetName: env.masterSheetName,
  };
};

const mapToRow = (columns: string[], row: Record<string, string | number | null | undefined>) =>
  columns.map((column) => {
    const value = row[column];
    if (value === null || value === undefined) return '';
    return String(value);
  });

export const appendSheetRow = async (params: {
  auth: GoogleOAuthClient;
  spreadsheetId: string;
  sheetName: keyof typeof REQUIRED_SHEETS;
  row: Record<string, string | number | null | undefined>;
}) => {
  const sheets = getSheets(params.auth);
  const columns = REQUIRED_SHEETS[params.sheetName];
  await sheets.spreadsheets.values.append({
    spreadsheetId: params.spreadsheetId,
    range: `${params.sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [mapToRow(columns, params.row)],
    },
  });
};

