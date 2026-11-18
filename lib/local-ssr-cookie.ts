/** SSR-only cookie for the *local* Commander JWT. Never store this in URLs or logs. */
export const LOCAL_ACCESS_COOKIE = '__Host-commander_laccess';
export const localCookieOptions = {
 httpOnly:true, secure:true, sameSite:'strict' as const, path:'/'
};
