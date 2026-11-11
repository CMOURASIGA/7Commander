/**
 * Explicitly opt-in protection for API mutations against the shared database.
 * This prevents browser -> Next.js API writes; it is NOT a database-level
 * read-only credential and does not restrict direct browser Supabase calls.
 */
export function localWriteGuardEnabled(env:NodeJS.ProcessEnv=process.env):boolean{
  return env.COMMANDER_LOCAL_READ_ONLY==="true";
}
export function localReadOnlyChatAllowed(pathname:string,method:string):boolean {
  return pathname==="/api/chat" && method.toUpperCase()==="POST";
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
