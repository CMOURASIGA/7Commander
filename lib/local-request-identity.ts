import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Auth context initialized synchronously before the first await in a route.
 * Its state is verified asynchronously against Supabase Auth before DB use.
 *
 * enterWith() only after an await does NOT propagate to the awaiting caller.
 * Keep the same object in its original async chain and mutate verified state.
 */
type LocalIdentityState = { token:string; userId:string|null; verified:boolean };
const localIdentity = new AsyncLocalStorage<LocalIdentityState>();

/** Call before first await; never grants access on its own. */
export function beginLocalIdentity(token:string):void {
  localIdentity.enterWith({token,userId:null,verified:false});
}

/** Call only after Supabase Auth getUser(token) has verified this exact token. */
export function verifyLocalIdentity(token:string,userId:string):boolean {
  const current=localIdentity.getStore();
  if (!current || current.token!==token || !userId) return false;
  current.userId=userId;
  current.verified=true;
  return true;
}

export function getLocalIdentity():{token:string;userId:string}|null {
  const current=localIdentity.getStore();
  if(!current?.verified || !current.userId) return null;
  return {token:current.token,userId:current.userId};
}
