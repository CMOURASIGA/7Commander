import { NextResponse } from 'next/server';
import { validatePublicEnv, validateServerEnv } from '@/lib/env';
/** Public health only exposes aggregate readiness, never names of environment variables. */
export async function GET() {
 const ready = validatePublicEnv().length === 0 && validateServerEnv().length === 0;
 return NextResponse.json({ ready }, {
  status: ready ? 200 : 503,
  headers: { 'Cache-Control': 'no-store' },
 });
}
