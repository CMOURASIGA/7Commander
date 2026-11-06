import { NextRequest, NextResponse } from 'next/server';
import { verifiedCommanderUser, sameOriginMutation } from '@/lib/central-local-session';
import { LOCAL_ACCESS_COOKIE, localCookieOptions } from '@/lib/local-ssr-cookie';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0' };
/** Establish a server-verifiable local session from an independently verified local JWT. */
export async function POST(request: NextRequest) {
  if (process.env.COMMANDER_CENTRAL_AUTH_ENABLED !== 'true' ||
      process.env.SERVICE_7SERVICE_ENFORCE_USER_ACCESS !== 'true')
    return NextResponse.json({ ok:false }, { status:404, headers });
  if (!sameOriginMutation(request))
    return NextResponse.json({ ok:false, code:'CSRF_DENIED' }, { status:403, headers });
  const authorization = request.headers.get('authorization') ?? '';
  const bearer = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(authorization)?.[1];
  if (!bearer || bearer.length > 10000)
    return NextResponse.json({ ok:false, code:'LOCAL_SESSION_REQUIRED' }, { status:401, headers });
  const user = await verifiedCommanderUser(request);
  if (!user) return NextResponse.json({ ok:false, code:'LOCAL_SESSION_INVALID' }, { status:401, headers });
  const response = NextResponse.json({ ok:true }, { headers });
  response.cookies.set(LOCAL_ACCESS_COOKIE, bearer, { ...localCookieOptions, maxAge: 3600 });
  return response;
}
/** Removing local SSR session also removes the central cookie; logout is idempotent. */
export async function DELETE(request: NextRequest) {
  if (!sameOriginMutation(request))
    return NextResponse.json({ ok:false, code:'CSRF_DENIED' }, { status:403, headers });
  const response = NextResponse.json({ ok:true }, { headers });
  response.cookies.set(LOCAL_ACCESS_COOKIE, '', { ...localCookieOptions, maxAge:0 });
  response.cookies.set('__Host-commander_caccess','',{...localCookieOptions,maxAge:0});
  response.cookies.set('__Host-commander_crefresh','',{...localCookieOptions,maxAge:0});
  return response;
}
