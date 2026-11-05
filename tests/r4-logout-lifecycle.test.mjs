import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
test('provider-shaped regression: only two null-session branches delete; signOut untouched',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'int01-r5-'));
 try {
  fs.mkdirSync(path.join(tmp,'components/auth'),{recursive:true});
  // This fixture reproduces the four clearClientAuthToken sites of the actual provider:
  // initial-session null branch, initial fetch error, auth event null branch, signOut.
  const initial=`async function syncProfile(user: User) {}
export function KairosAuthProvider() {
  useEffect(() => {
    void client.auth.getSession().then(async (result) => {
      if (sessionUser && token) {
        setClientAuthToken(token, sessionUser.email ?? null);
      } else {
        clearClientAuthToken();
        syncedUserIdRef.current = null;
      }
    }).catch(() => {
      clearClientAuthToken();
      setUser(null);
    });
    const subscription = client.auth.onAuthStateChange(async (_event, session) => {
      if (currentUser && token) {
        setClientAuthToken(token, currentUser.email ?? null);
      } else {
        clearClientAuthToken();
        syncedUserIdRef.current = null;
      }
    });
  }, []);
  const value = useMemo<KairosAuthState>(() => ({
      signInWithPassword: async (email: string, password: string) => {
        if (error) throw new Error("E-mail ou senha incorretos, ou conta nao habilitada.");
      },
      signOut: async () => {
        await client.auth.signOut();
        clearClientAuthToken();
        setUser(null);
      },
  }), []);
}`;
  const file=path.join(tmp,'components/auth/kairos-auth-provider.tsx');fs.writeFileSync(file,initial);
  const run=spawnSync(process.execPath,[path.join(root,'scripts/apply-local-ssr-session.mjs'),tmp],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const out=fs.readFileSync(file,'utf8');
  assert.equal((out.match(/method:'DELETE'/g)??[]).length,2,'exactly two guarded cleanup sites');
  const signOut=out.split('signOut: async () => {')[1].split('\n      },')[0];
  assert.doesNotMatch(signOut,/local-session|method:'DELETE'/);
  assert.match(out,/syncServerLocalSession\(token\)/);
  const repeat=spawnSync(process.execPath,[path.join(root,'scripts/apply-local-ssr-session.mjs'),tmp],{encoding:'utf8'});
  assert.notEqual(repeat.status,0,'second application must fail closed');
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});
test('patch aborts without changing provider when absence branches diverge',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'int01-r5-shape-'));
 try {
  fs.mkdirSync(path.join(tmp,'components/auth'),{recursive:true});
  const file=path.join(tmp,'components/auth/kairos-auth-provider.tsx');
  const initial='async function syncProfile(user: User) {}\n  useEffect(() => {\n    clearClientAuthToken();\n  }, []);\n  const value = useMemo<';
  fs.writeFileSync(file,initial);
  const run=spawnSync(process.execPath,[path.join(root,'scripts/apply-local-ssr-session.mjs'),tmp],{encoding:'utf8'});
  assert.notEqual(run.status,0);
  assert.equal(fs.readFileSync(file,'utf8'),initial);
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});
test('local logout clears local and both central cookies in one response',()=>{
 const src=fs.readFileSync(path.join(root,'app/api/auth/local-session/route.ts'),'utf8');
 for(const cookie of ['LOCAL_ACCESS_COOKIE','__Host-commander_caccess','__Host-commander_crefresh'])assert.ok(src.includes(cookie));
});
test('PUT Kairos profile mapped',async()=>{
 const {permissionForRoute}=await import('../lib/central-route-policy.mjs');
 assert.equal(permissionForRoute('/api/kairos/profile','PUT'),'kairos.profile.write');
});
