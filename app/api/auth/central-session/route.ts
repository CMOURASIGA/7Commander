import { NextRequest, NextResponse } from 'next/server';
import { verifiedCommanderUser,sameOriginMutation } from '@/lib/central-local-session';
import { centralSignIn, centralRefresh, getCentralServerSession, setCentralCookies, clearCentralCookies, CENTRAL_REFRESH_COOKIE } from '@/lib/central-session';
import { cookies } from 'next/headers';
export const dynamic='force-dynamic';
const noStore={ 'Cache-Control':'no-store' };
function denied(code:string,status=403){return NextResponse.json({ok:false,code},{status,headers:noStore});}
export async function POST(request:NextRequest) {
 if(process.env.COMMANDER_CENTRAL_AUTH_ENABLED!=='true')return denied('DISABLED',404);
 if(!sameOriginMutation(request))return denied('CSRF_DENIED');
 const local=await verifiedCommanderUser(request);
 if(!local)return denied('LOCAL_AUTH_REQUIRED',401);
 let body: unknown;
 try {body=await request.json();} catch{return denied('INVALID_REQUEST',400);}
 if(!body || typeof body!=='object' || Array.isArray(body))return denied('INVALID_REQUEST',400);
 const payload=body as Record<string,unknown>;
 if(typeof payload.email!=='string'||typeof payload.password!=='string'
    ||payload.email.trim().length===0||payload.email.length>320
    ||payload.password.length===0||payload.password.length>2048)
   return denied('INVALID_REQUEST',400);
 try{
   const session=await centralSignIn(payload.email.trim(),payload.password);
   const response=NextResponse.json({ok:true},{headers:noStore});
   setCentralCookies(response,session);return response;
 }catch{return denied('CENTRAL_LOGIN_DENIED',401);}
}
export async function PATCH(request:NextRequest) {
 if(process.env.COMMANDER_CENTRAL_AUTH_ENABLED!=='true')return denied('DISABLED',404);
 if(!sameOriginMutation(request))return denied('CSRF_DENIED');
 if(!await verifiedCommanderUser(request))return denied('LOCAL_AUTH_REQUIRED',401);
 const old=(await cookies()).get(CENTRAL_REFRESH_COOKIE)?.value;
 if(!old)return denied('CENTRAL_SESSION_EXPIRED',401);
 try{const session=await centralRefresh(old);const response=NextResponse.json({ok:true},{headers:noStore});setCentralCookies(response,session);return response;}
 catch{const response=denied('CENTRAL_SESSION_EXPIRED',401);clearCentralCookies(response);return response;}
}
export async function GET(request:NextRequest) {
 if(process.env.COMMANDER_CENTRAL_AUTH_ENABLED!=='true')return denied('DISABLED',404);
 if(!await verifiedCommanderUser(request))return denied('LOCAL_AUTH_REQUIRED',401);
 const current=await getCentralServerSession();
 return NextResponse.json({ok:Boolean(current)},{headers:noStore});
}
export async function DELETE(request:NextRequest) {
 if(!sameOriginMutation(request))return denied('CSRF_DENIED');
 const response=NextResponse.json({ok:true},{headers:noStore});
 clearCentralCookies(response);return response;
}
