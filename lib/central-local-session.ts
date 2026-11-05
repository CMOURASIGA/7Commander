import 'server-only';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/lib/env';

/** Validate the Commander's OWN JWT; no caller-supplied user identifiers. */
export async function verifiedCommanderUser(request: NextRequest) {
 const header=request.headers.get('authorization')??'';
 const token=/^Bearer ([A-Za-z0-9._~-]+)$/.exec(header)?.[1];
 if(!token)return null;
 const env=getPublicEnv();
 if(!env.NEXT_PUBLIC_SUPABASE_URL||!env.NEXT_PUBLIC_SUPABASE_ANON_KEY)return null;
 const auth=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
 {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const verified=await auth.auth.getUser(token);
 return verified.error||!verified.data.user?null:verified.data.user;
}
/** Mutations that set or clear cookies are same-origin only. */
export function sameOriginMutation(request:NextRequest) {
 const origin=request.headers.get('origin');
 const requestedHost=request.nextUrl.origin;
 const qaOrigin=process.env.INT01_TRUSTED_PROXY_ORIGIN;
 const proxyMatches=qaOrigin === 'https://localhost:8443'
   && request.headers.get('x-forwarded-host') === 'localhost:8443'
   && request.headers.get('x-forwarded-proto') === 'https'
   && origin === qaOrigin;

 if(!origin || (origin!==requestedHost && !proxyMatches))return false;
 const site=request.headers.get('sec-fetch-site');
 if(site&&site!=='same-origin')return false;
 return true;
}
