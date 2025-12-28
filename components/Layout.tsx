
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getStore, getCurrentSession, logout } from '../services/store';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const session = getCurrentSession();
  const { alerts, messages, transmissions, settings } = getStore();
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
    { to: '/patients', icon: 'fa-users', label: 'Dossiers Patients' },
    { to: '/transmissions', icon: 'fa-comments-dollar', label: 'Transmissions', badge: unreadTrans },
    { to: '/planning', icon: 'fa-calendar-days', label: 'Planning' },
    { to: '/prescriptions', icon: 'fa-file-medical', label: 'Ordonnances' },
    { to: '/billing', icon: 'fa-file-invoice-dollar', label: 'Facturation' },
    { to: '/messages', icon: 'fa-whatsapp', label: 'WhatsApp Patients', badge: unreadMessages },
    { to: '/tasks', icon: 'fa-check-double', label: 'Tâches Cabinet' },
    { to: '/meetings', icon: 'fa-handshake', label: 'Staff Coordination' },
    { to: '/alerts', icon: 'fa-bell', label: 'Centre Alertes', badge: unreadAlerts },
    { to: '/logs', icon: 'fa-list-check', label: 'Audit Trail', roles: ['admin', 'infirmiereAdmin'] },
    { to: '/settings', icon: 'fa-gear', label: 'Paramètres', roles: ['admin', 'infirmiereAdmin'] },
  ];

  const filteredNav = navItems.filter(item => !item.roles || item.roles.includes(session.role));

  const SidebarContent = () => (
    <>
      <div className="p-8 flex flex-col gap-1">
        <div className="flex items-center space-x-4 mb-2">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/40 rotate-3 shrink-0">
            <i className="fa-solid fa-user-nurse text-white text-2xl"></i>
          </div>
          <div className="min-w-0">
            <span className="text-2xl font-black tracking-tighter leading-none text-white">NurseBot</span>
            <p className="text-[8px] font-black uppercase text-emerald-500 tracking-widest mt-1 opacity-70">SaaS Coordination IDEL</p>
          </div>
        </div>
        <div className="mt-4 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest truncate">{settings.cabinetName}</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1.5 py-4 overflow-y-auto scrollbar-hide">
        {filteredNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all group ${
                isActive ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'hover:bg-slate-800 text-slate-400 font-bold'
              }`
            }
          >
            <div className="flex items-center space-x-4">
              <i className={`fa-solid ${item.icon} w-5 text-center group-hover:scale-110 transition-transform`}></i>
              <span className="text-[13px] tracking-tight">{item.label}</span>
            </div>
            {item.badge && item.badge > 0 ? (
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${item.label === 'Transmissions' ? 'bg-amber-400 text-slate-900' : 'bg-rose-500 text-white'}`}>
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <NavLink to="/chat" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5 mb-6 group">
           <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-sm shadow-lg group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-robot"></i>
           </div>
           <div>
              <span className="text-xs font-black text-white block">Assistant IA</span>
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">En ligne</span>
           </div>
        </NavLink>
        
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-[1.2rem] flex items-center justify-center font-black text-sm border-2 border-emerald-500/20 shadow-inner">
              {session.name[0]}
            </div>
            <div className="text-[11px] min-w-0">
              <p className="font-black text-white uppercase tracking-wider truncate">{session.name}</p>
              <p className="text-emerald-500 font-bold capitalize opacity-70">{session.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-slate-600 hover:text-rose-500 p-2.5 transition-colors bg-slate-800 rounded-xl">
             <i className="fa-solid fa-power-off"></i>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-900 text-white shrink-0 shadow-2xl relative z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
        
        {/* Drawer Panel */}
        <aside className={`absolute top-0 left-0 h-full w-80 bg-slate-900 shadow-2xl transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <SidebarContent />
            {/* Close button inside drawer */}
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white"
            >
              <i className="fa-solid fa-xmark text-2xl"></i>
            </button>
          </div>
        </aside>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 h-20 flex items-center justify-between px-6 md:px-10 shrink-0">
          <div className="flex items-center gap-4">
            {/* Hamburger Button for Mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
            >
              <i className="fa-solid fa-bars-staggered text-xl"></i>
            </button>
            
            <div className="flex flex-col lg:hidden">
               <div className="flex items-center space-x-2">
                 <i className="fa-solid fa-user-nurse text-emerald-500 text-xl"></i>
                 <span className="font-black tracking-tighter text-lg">NurseBot</span>
               </div>
            </div>

            <div className="hidden lg:block">
              <div className="flex items-center gap-6">
                <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${
                  session.role === 'admin' ? 'bg-purple-100 text-purple-600 border border-purple-200' :
                  session.role === 'infirmiereAdmin' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                }`}>
                  Session {session.role} Cabinet
                </span>
                <div className="flex items-center gap-3">
                   <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-emerald-500/50 shadow-lg"></div>
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Temps Réel</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="hidden sm:flex flex-col items-end mr-2">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aujourd'hui</p>
               <p className="text-sm font-black text-slate-900 uppercase">{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
            </div>
            <NavLink to="/alerts" className="relative p-3 bg-slate-100 text-slate-400 hover:text-emerald-500 transition-all rounded-2xl">
              <i className="fa-solid fa-bell text-lg"></i>
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-lg">
                  {unreadAlerts}
                </span>
              )}
            </NavLink>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
          <div className="p-6 md:p-10 pb-20 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
