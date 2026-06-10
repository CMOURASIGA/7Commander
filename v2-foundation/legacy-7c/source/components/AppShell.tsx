import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  FileStack,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  X,
  Cpu,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';

interface AppShellProps {
  children: React.ReactNode;
}

interface MenuItem {
  to: string;
  label: string;
  testId: string;
  icon: React.ComponentType<{ size?: number }>;
}

const menuItems: MenuItem[] = [
  { to: '/', label: 'Início', testId: 'nav-inicio', icon: LayoutDashboard },
  { to: '/clients', label: 'Clientes', testId: 'nav-clientes', icon: Users },
  { to: '/projects', label: 'Projetos', testId: 'nav-projetos', icon: Briefcase },
  { to: '/artifacts', label: 'Artefatos', testId: 'nav-artefatos', icon: FileStack },
  { to: '/agents', label: 'Agentes', testId: 'nav-agentes', icon: Cpu },
  { to: '/help', label: 'Ajuda', testId: 'nav-ajuda', icon: HelpCircle },
  { to: '/settings', label: 'Configurações', testId: 'nav-configuracoes', icon: Settings },
];

const labelMap: Record<string, string> = {
  '/': 'Início',
  '/clients': 'Clientes',
  '/projects': 'Projetos',
  '/artifacts': 'Artefatos',
  '/agents': 'Agentes',
  '/help': 'Ajuda',
  '/settings': 'Configurações',
};

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const settings = useWorkspaceStore((state) => state.settings);
  const projects = useWorkspaceStore((state) => state.projects);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const userInitials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const breadcrumbItems = useMemo(() => {
    if (location.pathname.startsWith('/projects/') && location.pathname !== '/projects') {
      const projectId = location.pathname.split('/')[2] || '';
      const projectName = projects.find((project) => project.id === projectId)?.name || 'Workspace';
      return [
        { label: 'Projetos', to: '/projects' },
        { label: projectName },
      ];
    }

    if (location.pathname.startsWith('/artifacts/project/') && location.pathname !== '/artifacts') {
      const projectId = location.pathname.split('/')[3] || '';
      const projectName = projects.find((project) => project.id === projectId)?.name || 'Projeto';
      return [
        { label: 'Artefatos', to: '/artifacts' },
        { label: projectName },
      ];
    }

    return [{ label: labelMap[location.pathname] || 'Workspace' }];
  }, [location.pathname, projects]);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-60 transform border-r border-slate-200 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img src={settings.brandLogoUrl} alt="7C Commander" className="h-10 w-10 rounded-xl object-cover" />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-brand-500">7C Commander</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Workspace: {user?.email || 'sem e-mail de sessão'}
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-1 p-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.to ||
                  (item.to !== '/' && location.pathname.startsWith(item.to));

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    data-testid={item.testId}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-brand-500/30 bg-brand-500/10 text-brand-500'
                        : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
              <button
                onClick={toggleTheme}
                data-testid="theme-toggle-button"
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                  theme === 'light'
                    ? 'border-slate-200 bg-slate-100 text-slate-700'
                    : 'border-slate-700 bg-slate-800 text-slate-200'
                }`}
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                {theme === 'light' ? 'Tema escuro' : 'Tema claro'}
              </button>

              <button
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogOut size={14} />
                Sair
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 md:px-6">
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:hidden"
                onClick={() => setMobileOpen((value) => !value)}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">Workspace ativo</p>
                <div className="flex flex-wrap items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {breadcrumbItems.map((item, index) => (
                    <React.Fragment key={`${item.label}-${index}`}>
                      {item.to ? (
                        <Link
                          to={item.to}
                          className="rounded px-1 text-slate-700 hover:underline dark:text-slate-200"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span>{item.label}</span>
                      )}
                      {index < breadcrumbItems.length - 1 && (
                        <span className="text-slate-400 dark:text-slate-500">/</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:flex">
                <BarChart3 size={14} className="text-brand-500" />
                <span className="text-xs font-semibold">{settings.appEnv}</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <p className="text-[10px] font-semibold uppercase tracking-wider">Usuário</p>
                <div className="mt-1 flex items-center gap-2">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || 'Usuario'}
                      className="h-6 w-6 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-[10px] font-black dark:border-slate-600">
                      {userInitials}
                    </span>
                  )}
                  <p className="text-xs font-bold">{user?.name || 'Sem sessao'}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
};
