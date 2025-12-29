
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getStore, getCurrentSession, logout } from '../services/store';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const session = getCurrentSession();
  const { alerts, messages, transmissions, settings, dbStatus, dbError } = getStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const unreadAlerts = alerts.filter(a => !a.isRead && (!a.userId || a.userId === session?.userId)).length;
  const unreadMessages = messages.filter(m => m.direction === 'inbound' && m.status !== 'read').length;
  const unreadTrans = transmissions.filter((t:any) => t.status === 'sent' && t.fromId !== session?.userId).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!session) return <>{children}</>;

  const navItems = [
    { to: '/', icon: 'fa-house', label: 'Dashboard' },
    { to: '/patients', icon: 'fa-users', label: 'Patients' },
    { to: '/transmissions', icon: 'fa-comments-dollar', label: 'Transmissions', badge: unreadTrans },
    { to: '/planning', icon: 'fa-calendar-days', label: 'Planning' },
    { to: '/prescriptions', icon: 'fa-file-medical', label: 'Ordonnances' },
    { to: '/billing', icon: 'fa-file-invoice-dollar', label: 'Facturation' },
    { to: '/messages', icon: 'fa-whatsapp', label: 'Messages', badge: unreadMessages },
    { to: '/tasks', icon: 'fa-check-double', label: 'Tâches' },
    { to: '/meetings', icon: 'fa-handshake', label: 'Staff' },
    { to: '/settings', icon: 'fa-gear', label: 'Paramètres', roles: ['admin', 'infirmiereAdmin'] },
  ];

  const filteredNav = navItems.filter(item => !item.roles || item.roles.includes(session.role));

  const SidebarContent = () => (
    <>
      <div className="p-8 flex items-center space-x-3">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <i className="fa-solid fa-user-nurse text-white text-xl"></i>
        </div>
        <span className="text-xl font-black tracking-tighter text-slate-900">NurseBot</span>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto scrollbar-hide">
        {filteredNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between px-5 py-3 rounded-xl transition-all group ${
                isActive ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-500 font-semibold'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center space-x-4">
                  <i className={`fa-solid ${item.icon} w-5 text-center text-sm ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-600'}`}></i>
                  <span className="text-[13px] tracking-tight">{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-500'}`}>
                    {item.badge}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-100">
        <div className="flex items-center justify-between px-2 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-black text-sm border border-slate-200">
              {session.name[0]}
            </div>
            <div className="text-[11px] min-w-0">
              <p className="font-black text-slate-900 truncate uppercase">{session.name.split(' ')[0]}</p>
              <p className="text-slate-400 font-bold capitalize opacity-70">{session.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-slate-300 hover:text-rose-500 transition-colors">
             <i className="fa-solid fa-power-off text-sm"></i>
          </button>
        </div>
        <div className="px-2 text-[8px] font-black text-slate-300 uppercase tracking-widest text-center">
           Build: {process.env.VITE_BUILD_DATE}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-white lg:bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 shrink-0 relative z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
        <aside className={`absolute top-0 left-0 h-full w-72 bg-white shadow-2xl transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <SidebarContent />
          </div>
        </aside>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 h-20 flex items-center justify-between px-6 md:px-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-500">
              <i className="fa-solid fa-bars-staggered text-xl"></i>
            </button>
            <div className="flex items-center gap-4 group cursor-help relative">
              <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : dbStatus === 'loading' ? 'bg-slate-300 animate-pulse' : 'bg-amber-500'}`}></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {dbStatus === 'connected' ? 'Cloud Synchronisé' : dbStatus === 'loading' ? 'Connexion...' : 'Mode Hors-ligne'}
              </span>
              
              {/* Tooltip detail */}
              <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                 <p className="text-[10px] font-black uppercase text-emerald-500 mb-1">Diagnostic Temps Réel</p>
                 <p className="text-[11px] font-medium leading-relaxed">
                   {dbStatus === 'connected' 
                     ? "Base Supabase connectée. Vos données sont persistées sur le serveur Cloud en temps réel." 
                     : dbStatus === 'error' 
                       ? `Erreur : ${dbError || "Impossible de joindre le serveur SQL."}`
                       : "Données stockées uniquement sur cet appareil."}
                 </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 md:space-x-6">
            <button onClick={() => navigate('/alerts')} className="relative p-2.5 text-slate-400 hover:text-slate-900 transition-all">
              <i className="fa-solid fa-bell text-lg"></i>
              {unreadAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                  {unreadAlerts}
                </span>
              )}
            </button>
            <div className="hidden sm:block h-8 w-[1px] bg-slate-100"></div>
            <div className="hidden sm:flex flex-col items-end">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}</p>
               <p className="text-sm font-black text-slate-900">{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-10 pb-24 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
