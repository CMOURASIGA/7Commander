import { AsyncLocalStorage } from "node:async_hooks";

/** Isolated token context for one authenticated local HTTP request. */
type LocalIdentity = { token:string; userId:string };
const localIdentity = new AsyncLocalStorage<LocalIdentity>();

export function bindLocalIdentity(token:string,userId:string): void {
  // Only invoked after Supabase Auth getUser verifies the token.
  localIdentity.enterWith({token,userId});
}
export function getLocalIdentity():LocalIdentity|null {
  return localIdentity.getStore() ?? null;
}
