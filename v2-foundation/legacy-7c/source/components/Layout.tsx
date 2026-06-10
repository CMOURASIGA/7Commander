
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Cpu, 
  Settings, 
  HelpCircle, 
  Menu, 
  X, 
  ChevronRight,
  PlusCircle,
  Sun,
  Moon
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

const SidebarItem = ({ to, icon: Icon, label, active, collapsed }: any) => (
  <Link
    to={to}
    className={`flex items-center p-3 rounded-xl transition-all group mb-1 ${
      active 
        ? 'bg-brand-500/10 text-brand-400 shadow-[inset_0_0_0_1px_rgba(242,101,34,0.2)]' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
    }`}
  >
    <Icon size={20} className={active ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'} />
    {!collapsed && <span className="ml-3 font-bold text-[11px] uppercase tracking-widest leading-none">{label}</span>}
  </Link>
);

interface LayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();

  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderKanban, label: 'Projetos' },
    { to: '/agents', icon: Cpu, label: 'Agents Lab' },
    { to: '/help', icon: HelpCircle, label: 'Ajuda' },
    { to: '/settings', icon: Settings, label: 'Configurações' },
  ];

  const currentPath = location.pathname;
  const logoUrl = 'https://i.imgur.com/GUOMwkI.png';

  return (
    <div className={`flex h-screen w-full overflow-hidden ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-200'}`}>
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 transform 
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 lg:static 
          ${collapsed ? 'w-20' : 'w-72'} 
          ${theme === 'light' ? 'bg-white border-r border-slate-200' : 'bg-slate-900 border-r border-slate-800/50 shadow-2xl'}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800/10">
            {!collapsed ? (
              <div className="flex items-center gap-3">
                <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain drop-shadow-lg" />
                <div className="flex flex-col">
                  <span className={`text-[11px] font-black leading-tight tracking-[0.08em] uppercase ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>PM COMMAND</span>
                  <span className="text-[9px] font-bold text-brand-500 tracking-[0.3em] uppercase opacity-90">CENTER</span>
                </div>
              </div>
            ) : (
              <img src={logoUrl} alt="Logo" className="h-8 w-auto mx-auto object-contain" />
            )}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className={`hidden lg:flex p-1.5 rounded-lg transition-colors ${theme === 'light' ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-slate-800'}`}
            >
              <ChevronRight size={18} className={collapsed ? '' : 'rotate-180'} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => (
              <SidebarItem 
                key={item.to}
                {...item} 
                active={currentPath === item.to || (item.to !== '/' && currentPath.startsWith(item.to))}
                collapsed={collapsed}
              />
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800/10 space-y-2">
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 transition-all active:scale-95 ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-brand-400'
              }`}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              {!collapsed && (
                <span className="text-[10px] uppercase tracking-widest font-black">
                  Tema: {theme === 'light' ? 'Claro' : 'Escuro'}
                </span>
              )}
            </button>
            <button 
              onClick={() => navigate('/projects')}
              className={`w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-brand-600/20 active:scale-95 ${collapsed ? 'px-0' : 'px-4'}`}
            >
              <PlusCircle size={18} />
              {!collapsed && <span className="text-[10px] uppercase tracking-widest font-black">Novo Projeto</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar */}
        <header className={`h-20 flex items-center justify-between px-8 z-30 flex-shrink-0 ${theme === 'light' ? 'bg-white/80 border-b border-slate-200' : 'bg-slate-900/50 border-b border-slate-800/50'} backdrop-blur-xl`}>
          <div className="flex items-center">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden mr-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-xl">
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <h1 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                SISTEMA OPERACIONAL
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(242,101,34,0.7)]"></div>
                <span className={`text-xs font-black uppercase tracking-widest ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>Status: Online</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className={`p-2.5 rounded-xl border transition-all active:scale-90 ${theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-brand-400'}`}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className={`hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl border ${theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700 shadow-inner'}`}>
              <div className="text-right">
                <p className="text-[8px] text-slate-500 font-black uppercase leading-none mb-0.5 tracking-tighter">PROJECT MANAGER</p>
                <p className={`text-[10px] font-black uppercase tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>ADMIN USER</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center text-white font-black text-[10px] shadow-lg">
                PM
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className={`flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar ${theme === 'light' ? 'bg-slate-50/50' : 'bg-slate-950/20'}`}>
          <div className="max-w-[1400px] mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};



