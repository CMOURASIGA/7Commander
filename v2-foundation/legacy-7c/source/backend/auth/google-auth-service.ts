import { google } from 'googleapis';
import { env, ensureAuthEnv } from '../config/env.js';

export type GoogleOAuthClient = InstanceType<typeof google.auth.OAuth2>;

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
];

const getPrisma = async () => {
  const mod = await import('../db/prisma.js');
  return mod.prisma;
};

export const createOAuthClient = (): GoogleOAuthClient => {
  ensureAuthEnv();
  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, env.googleRedirectUri);
};

export const buildGoogleAuthUrl = (state?: string) => {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    state,
  });
};

export const exchangeCodeForTokens = async (code: string) => {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  return { client, tokens };
};

export const readGoogleProfile = async (oauthClient: GoogleOAuthClient) => {
  const oauth2 = google.oauth2({ version: 'v2', auth: oauthClient });
  const { data } = await oauth2.userinfo.get();
  if (!data.id || !data.email || !data.name) {
    throw new Error('Unable to read required Google profile fields');
  }
  return {
    googleSub: data.id,
    email: data.email.toLowerCase(),
    name: data.name,
    picture: data.picture || null,
  };
};

export const upsertUserFromGoogle = async (profile: {
  googleSub: string;
  email: string;
  name: string;
  picture: string | null;
}) => {
  const prisma = await getPrisma();
  const user = await prisma.user.upsert({
    where: { googleSub: profile.googleSub },
    update: {
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      lastLoginAt: new Date(),
    },
    create: {
      googleSub: profile.googleSub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      lastLoginAt: new Date(),
    },
  });

  return user;
};

export const upsertGoogleCredentials = async (
  userId: string,
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
    scope?: string | null;
    token_type?: string | null;
  }
) => {
  const prisma = await getPrisma();
  await prisma.googleCredential.upsert({
    where: { userId },
    update: {
      accessToken: tokens.access_token || undefined,
      refreshToken: tokens.refresh_token || undefined,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scope: tokens.scope || undefined,
      tokenType: tokens.token_type || undefined,
    },
    create: {
      userId,
      accessToken: tokens.access_token || undefined,
      refreshToken: tokens.refresh_token || undefined,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scope: tokens.scope || undefined,
      tokenType: tokens.token_type || undefined,
    },
  });
};

export const loadOAuthClientForUser = async (userId: string) => {
  const prisma = await getPrisma();
  const credentials = await prisma.googleCredential.findUnique({
    where: { userId },
  });
  if (!credentials) {
    return null;
  }

  const client = createOAuthClient();
  client.setCredentials({
    access_token: credentials.accessToken || undefined,
    refresh_token: credentials.refreshToken || undefined,
    expiry_date: credentials.expiryDate ? credentials.expiryDate.getTime() : undefined,
    scope: credentials.scope || undefined,
    token_type: credentials.tokenType || undefined,
  });

  return client;
};

