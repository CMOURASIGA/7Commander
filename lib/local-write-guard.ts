/**
 * Local-only protection for API mutations against the shared production database.
 * This prevents browser -> Next.js API writes; it is NOT a database-level
 * read-only credential and does not restrict direct browser Supabase calls.
 */
export function localWriteGuardEnabled(env:NodeJS.ProcessEnv=process.env):boolean{
  return env.NODE_ENV==="development" && env.COMMANDER_LOCAL_READ_ONLY==="true";
}
export function shouldBlockLocalApiMutation(input:{
  pathname:string;
  method:string;
  enabled:boolean;
}):boolean{
  return input.enabled
    && (input.pathname==="/api" || input.pathname.startsWith("/api/"))
    && !["GET","HEAD","OPTIONS"].includes(input.method.toUpperCase());
}
