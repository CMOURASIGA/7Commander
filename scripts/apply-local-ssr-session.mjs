import fs from 'node:fs';import path from 'node:path';
const repo=process.argv[2];
if(!repo)throw new Error('Usage: node apply-local-ssr-session.mjs <checkout>');
const file=path.join(repo,'components/auth/kairos-auth-provider.tsx');
let src=fs.readFileSync(file,'utf8');
if(src.includes('syncServerLocalSession('))throw new Error('Already applied; manual review required');
const anchor='async function syncProfile(user: User) {';
if(!src.includes(anchor))throw new Error('Provider changed: abort');
const helper=`/** Best-effort SSR synchronization; middleware fails closed if session cannot be validated. */
async function syncServerLocalSession(accessToken: string) {
  const result=await fetch('/api/auth/local-session',{
    method:'POST',credentials:'same-origin',
    headers:{Authorization:'Bearer '+accessToken},
  });
  if(!result.ok && result.status!==404)throw new Error('LOCAL_SSR_COOKIE_SYNC_FAILED');
}

`;
src=src.replace(anchor,helper+anchor);
// Call before profile synchronization; fail closed if browser cannot establish cookie.
src=src.replaceAll('setClientAuthToken(token, sessionUser.email ?? null);',
  'setClientAuthToken(token, sessionUser.email ?? null);\n        await syncServerLocalSession(token);');
src=src.replaceAll('setClientAuthToken(token, currentUser.email ?? null);',
  'setClientAuthToken(token, currentUser.email ?? null);\n        await syncServerLocalSession(token);');
const signinNeedle='if (error) throw new Error("E-mail ou senha incorretos, ou conta nao habilitada.");';
if(!src.includes(signinNeedle))throw new Error('Sign-in method changed: abort');
src=src.replace(signinNeedle,signinNeedle+`
        const {data:{session}}=await client.auth.getSession();
        if(session?.access_token)await syncServerLocalSession(session.access_token);`);
// Patch ONLY the two explicit `else` branches in the provider's useEffect.
// Never replace clearClientAuthToken() globally: signOut() also calls it.
const effectStart=src.indexOf('  useEffect(() => {');
const effectEnd=src.indexOf('  const value = useMemo<',effectStart);
if(effectStart<0 || effectEnd<effectStart)throw new Error('Provider shape changed: useEffect boundary');
const effect=src.slice(effectStart,effectEnd);
const initialAnchor='      } else {\n        clearClientAuthToken();';
const eventAnchor='      } else {\n        clearClientAuthToken();';
const occurrences=effect.split(initialAnchor).length-1;
if(occurrences!==2)throw new Error(`Expected exactly two auth absence branches; found ${occurrences}`);
const injected='      } else {\n        clearClientAuthToken();\n        void fetch(\'/api/auth/local-session\',{method:\'DELETE\',credentials:\'same-origin\'}).catch(()=>{});';
const updatedEffect=effect.replaceAll(eventAnchor,injected);
src=src.slice(0,effectStart)+updatedEffect+src.slice(effectEnd);
// Structural fail-safe: the signOut method must not perform direct server cleanup.
const signOutStart=src.indexOf('      signOut: async () => {');
const signOutEnd=src.indexOf('\n      },',signOutStart);
if(signOutStart<0 || signOutEnd<signOutStart)throw new Error('Provider signOut shape changed');
if(src.slice(signOutStart,signOutEnd).includes('/api/auth/local-session'))throw new Error('Unsafe direct logout cleanup detected');
fs.writeFileSync(file,src);console.log('Local SSR sync applied: precisely two absence branches; signOut untouched.');
