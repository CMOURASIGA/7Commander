const readEnv = (key: string, fallback?: string) => {
  const value = process.env[key];
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return value;
};

const requireEnv = (key: string) => {
  const value = readEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const toBoolean = (value: string | undefined, fallback = false) => {
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const env = {
  nodeEnv: readEnv('NODE_ENV', 'development')!,
  appBaseUrl: readEnv('APP_BASE_URL', 'http://localhost:3000')!,
  frontendUrl: readEnv('FRONTEND_URL', 'http://localhost:5173')!,
  googleClientId: readEnv('GOOGLE_CLIENT_ID'),
  googleClientSecret: readEnv('GOOGLE_CLIENT_SECRET'),
  googleRedirectUri:
    readEnv('GOOGLE_REDIRECT_URI') ||
    (readEnv('NODE_ENV', 'development') === 'production'
      ? undefined
      : `${readEnv('APP_BASE_URL', 'http://localhost:3000')!.replace(/\/$/, '')}/api/auth/google/callback`),
  sessionSecret: readEnv('SESSION_SECRET'),
  cookieDomain: readEnv('COOKIE_DOMAIN'),
  cookieSecure: toBoolean(readEnv('COOKIE_SECURE'), false),
  driveRootFolderName: readEnv('GOOGLE_DRIVE_ROOT_FOLDER_NAME', 'PM Command Center')!,
  masterSheetName: readEnv('GOOGLE_MASTER_SHEET_NAME', 'PM Command Center - Controle')!,
  sessionTtlHours: Number(readEnv('SESSION_TTL_HOURS', '168')),
};

export const ensureAuthEnv = () => {
  requireEnv('GOOGLE_CLIENT_ID');
  requireEnv('GOOGLE_CLIENT_SECRET');
  if (!env.googleRedirectUri) {
    throw new Error('Missing required environment variable: GOOGLE_REDIRECT_URI');
  }
  if (env.nodeEnv === 'production') {
    requireEnv('SESSION_SECRET');
  }
};
