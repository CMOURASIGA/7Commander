import type { User } from "@supabase/supabase-js";
import { DEMO_SESSION_KEY } from "./config";

type Listener = (event: string, session: DemoSession | null) => void;
type DemoSession = { access_token: string; user: User };
const listeners = new Set<Listener>();

const user: User = {
  id: "d0000000-0000-4000-8000-000000000001",
  app_metadata: { provider: "demo" },
  user_metadata: { full_name: "Pessoa Demonstração", name: "Pessoa Demonstração" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
  email: "apresentacao@example.invalid",
} as User;

function session(): DemoSession | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEMO_SESSION_KEY) === "active"
    ? { access_token: "commander-demo-local-token", user }
    : null;
}

function activate() {
  window.localStorage.setItem(DEMO_SESSION_KEY, "active");
  const value = session();
  listeners.forEach((listener) => listener("SIGNED_IN", value));
  return value;
}

export function createDemoAuthClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: session() }, error: null }),
      getUser: async () => ({ data: { user: session()?.user ?? null }, error: null }),
      signInWithPassword: async () => {
        const current = activate();
        return { data: { session: current, user }, error: null };
      },
      signInWithOAuth: async () => {
        activate();
        window.location.assign("/");
        return { data: { provider: "demo", url: null }, error: null };
      },
      verifyOtp: async () => ({ data: { session: activate(), user }, error: null }),
      signOut: async () => {
        window.localStorage.removeItem(DEMO_SESSION_KEY);
        listeners.forEach((listener) => listener("SIGNED_OUT", null));
        return { error: null };
      },
      onAuthStateChange: (listener: Listener) => {
        listeners.add(listener);
        return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
      },
    },
  };
}

