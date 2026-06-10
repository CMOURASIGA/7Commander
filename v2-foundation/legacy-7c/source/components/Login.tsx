import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AuthUser } from '../types';
import { authMode, backendMode } from '../services/envService';
import { useThemeStore } from '../store/useThemeStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { backendApi } from '../services/backendApi';

interface LoginProps {
  onAuthenticated: (user: AuthUser) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const decodeJwt = (token: string): Record<string, unknown> | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const Login: React.FC<LoginProps> = ({ onAuthenticated }) => {
  const theme = useThemeStore((state) => state.theme);
  const settings = useWorkspaceStore((state) => state.settings);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const runtimeAuthMode = useMemo(() => authMode(), []);
  const runtimeBackendMode = useMemo(() => backendMode(), []);

  useEffect(() => {
    if (runtimeBackendMode !== 'api' || runtimeAuthMode !== 'google') return;

    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');
    if (!code) return;

    setGoogleLoading(true);
    backendApi
      .exchangeGoogleCode(code)
      .then(() => backendApi.getMe())
      .then((me) => {
        if (!me.authenticated || !me.user) {
          throw new Error('Nao foi possivel autenticar apos callback do Google.');
        }
        onAuthenticated({
          email: me.user.email,
          name: me.user.name,
          picture: me.user.picture,
          provider: 'google',
        });
        query.delete('code');
        query.delete('scope');
        query.delete('authuser');
        query.delete('prompt');
        const nextQuery = query.toString();
        const nextUrl = `${window.location.origin}${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', nextUrl);
      })
      .catch((error) => {
        setGoogleError(error instanceof Error ? error.message : 'Falha ao concluir login com Google.');
      })
      .finally(() => setGoogleLoading(false));
  }, [onAuthenticated, runtimeAuthMode, runtimeBackendMode]);

  useEffect(() => {
    if (runtimeBackendMode === 'api') return;
    if (runtimeAuthMode !== 'google') return;
    if (!settings.googleClientId) {
      setGoogleError('VITE_GOOGLE_CLIENT_ID nao configurado. Use modo local para validar.');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const google = window.google;
      if (!google) {
        setGoogleError('Google Identity nao foi carregado.');
        return;
      }

      const handleCredential = (response: { credential: string }) => {
        const decoded = decodeJwt(response.credential);
        if (!decoded) {
          setGoogleError('Falha ao ler credencial do Google.');
          return;
        }

        onAuthenticated({
          email: String(decoded.email || 'google.user@local'),
          name: String(decoded.name || 'Google User'),
          picture: decoded.picture ? String(decoded.picture) : undefined,
          provider: 'google',
        });
      };

      google.accounts.id.initialize({
        client_id: settings.googleClientId,
        callback: handleCredential,
      });

      const target = document.getElementById('google-login-button');
      if (target) {
        google.accounts.id.renderButton(target, {
          theme: theme === 'light' ? 'outline' : 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 290,
        });
      }

      setGoogleReady(true);
      google.accounts.id.prompt();
    };

    script.onerror = () => setGoogleError('Nao foi possivel carregar o script de autenticacao do Google.');
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [onAuthenticated, runtimeAuthMode, settings.googleClientId, theme]);

  const handleBackendGoogleAccess = async () => {
    try {
      setGoogleLoading(true);
      setGoogleError(null);
      const authUrl = await backendApi.getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      setGoogleError(error instanceof Error ? error.message : 'Nao foi possivel iniciar login com Google.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className={`flex min-h-screen items-center justify-center px-4 ${theme === 'light' ? 'bg-slate-50' : 'bg-slate-950'}`}>
      <div className={`w-full max-w-md rounded-3xl border p-8 shadow-2xl ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <div className="mb-8 text-center">
          <img src={settings.brandLogoUrl} alt="7C Commander" className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover" />
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-500">7C Commander</p>
          <h1 className={`mt-2 text-2xl font-black ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            Plataforma de Gestão por Projeto
          </h1>
          <p className={`mt-2 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            Login com Google para acesso ao ambiente oficial.
          </p>
        </div>

        <div className="space-y-4">
          {runtimeAuthMode === 'google' ? (
            <div className={`rounded-2xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/40'}`}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand-500">Acesso Google</p>
              {runtimeBackendMode === 'api' ? (
                <button
                  type="button"
                  onClick={handleBackendGoogleAccess}
                  disabled={googleLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
                >
                  {googleLoading ? 'Conectando...' : 'Entrar com Google'}
                </button>
              ) : (
                <>
                  <div id="google-login-button" className="flex justify-center" />
                  {!googleReady && !googleError && (
                    <p className={`mt-2 text-center text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Carregando autenticacao Google...
                    </p>
                  )}
                </>
              )}
              {googleError && (
                <p className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-500">
                  <AlertCircle size={14} />
                  {googleError}
                </p>
              )}
            </div>
          ) : (
            <div className={`rounded-2xl border p-4 text-sm ${theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-700 bg-slate-800/40 text-slate-300'}`}>
              Modo de autenticacao ativo: <strong>local</strong> (`VITE_AUTH_MODE=local`).
            </div>
          )}

          {runtimeBackendMode === 'local' && (
            <div className={`rounded-2xl border p-4 text-sm ${theme === 'light' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-amber-800/40 bg-amber-900/20 text-amber-200'}`}>
              Ambiente local sem login habilitado. Configure `VITE_BACKEND_MODE=api` para autenticação real.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
