/**
 * Explicitly opt-in protection for API mutations against the shared database.
 * This prevents browser -> Next.js API writes; it is NOT a database-level
 * read-only credential and does not restrict direct browser Supabase calls.
 */
/** Local auth uses the signed-in user's JWT and RLS, never a service key. */
export function localAuthEnabled(env:NodeJS.ProcessEnv=process.env):boolean {
  return env.NODE_ENV==="development" && env.COMMANDER_LOCAL_AUTH_ENABLED==="true";
}
export function localWriteGuardEnabled(env:NodeJS.ProcessEnv=process.env):boolean{
  return env.COMMANDER_LOCAL_READ_ONLY==="true";
}
export function localReadOnlyChatAllowed(pathname:string,method:string):boolean {
  return (pathname==="/api/chat" && method.toUpperCase()==="POST")
    || (pathname==="/api/auth/local-session" && ["POST","DELETE"].includes(method.toUpperCase()));
}
export function shouldBlockLocalApiMutation(input:{
  pathname:string;
  method:string;
  enabled:boolean;
}):boolean{
  return input.enabled
    && (input.pathname==="/api" || input.pathname.startsWith("/api/"))
    && !["GET","HEAD","OPTIONS"].includes(input.method.toUpperCase())
    && !localReadOnlyChatAllowed(input.pathname,input.method);
}
