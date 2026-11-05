import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const CENTRAL_ACCESS_COOKIE = '__Host-commander_caccess';
export const CENTRAL_REFRESH_COOKIE = '__Host-commander_crefresh';
const MAX_ACCESS_AGE = 3600;
const MAX_REFRESH_AGE = 60 * 60 * 24 * 7;

function authClient() {
  const url = process.env.SERVICE_7SERVICE_SUPABASE_URL;
  const key = process.env.SERVICE_7SERVICE_SUPABASE_ANON_KEY;
  if (!url || !key || !/^https:\/\/[^/]+$/.test(url)) throw new Error('CENTRAL_AUTH_NOT_CONFIGURED');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl:false } });
}
export async function centralSignIn(email: string, password: string) {
  const auth = authClient();
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw new Error('CENTRAL_LOGIN_DENIED');
  return data.session;
}
export async function centralRefresh(refreshToken: string) {
  const { data, error } = await authClient().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) throw new Error('CENTRAL_SESSION_EXPIRED');
  return data.session;
}
export async function verifyCentralJwt(accessToken: string) {
  if (!accessToken || accessToken.length > 10000) return null;
  const { data, error } = await authClient().auth.getUser(accessToken);
  if (error || !data.user) return null;
  return { authUserId:data.user.id, accessToken };
}
export async function getCentralServerSession() {
  const jar = await cookies();
  return verifyCentralJwt(jar.get(CENTRAL_ACCESS_COOKIE)?.value ?? '');
}
export const centralCookieOptions = {
  httpOnly: true, secure: true, sameSite: 'strict' as const, path:'/'
};
export function setCentralCookies(response: import('next/server').NextResponse,
  session: { access_token:string;refresh_token:string;expires_in:number }) {
  response.cookies.set(CENTRAL_ACCESS_COOKIE, session.access_token, {
    ...centralCookieOptions, maxAge: Math.min(MAX_ACCESS_AGE,Math.max(1,session.expires_in))
  });
  response.cookies.set(CENTRAL_REFRESH_COOKIE, session.refresh_token, {
    ...centralCookieOptions,maxAge: MAX_REFRESH_AGE
  });
}
export function clearCentralCookies(response: import('next/server').NextResponse) {
  response.cookies.set(CENTRAL_ACCESS_COOKIE,'',{...centralCookieOptions,maxAge:0});
  response.cookies.set(CENTRAL_REFRESH_COOKIE,'',{...centralCookieOptions,maxAge:0});
}
