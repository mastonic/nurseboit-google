
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getStore, getCurrentSession, logout } from '../services/store';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const session = getCurrentSession();
  const { alerts, messages } = getStore();
  
  const unreadAlerts = alerts.filter(a => !a.isRead && (!a.userId || a.userId === session?.userId)).length;
  const unreadMessages = messages.filter(m => m.direction === 'inbound' && m.status !== 'read').length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!session) return <>{children}</>;

  const navItems = [
    { to: '/', icon: 'fa-house', label: 'Dashboard' },
    { to: '/patients', icon: 'fa-users', label: 'Patients' },
    { to: '/planning', icon: 'fa-calendar-days', label: 'Planning' },
    { to: '/prescriptions', icon: 'fa-file-medical', label: 'Ordonnances' },
    { to: '/billing', icon: 'fa-file-invoice-dollar', label: 'Facturation' },
    { to: '/messages', icon: 'fa-message', label: 'Messages', badge: unreadMessages },
    { to: '/tasks', icon: 'fa-check-double', label: 'Tâches' },
    { to: '/meetings', icon: 'fa-handshake', label: 'Réunions' },
    { to: '/alerts', icon: 'fa-bell', label: 'Alertes', badge: unreadAlerts },
    { to: '/logs', icon: 'fa-list-check', label: 'Activité', roles: ['admin', 'infirmiereAdmin'] },
    { to: '/settings', icon: 'fa-gear', label: 'Paramètres', roles: ['admin', 'infirmiereAdmin'] },
  ];

  const filteredNav = navItems.filter(item => !item.roles || item.roles.includes(session.role));

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <i className="fa-solid fa-user-nurse text-white text-xl"></i>
          </div>
          <span className="text-xl font-black tracking-tighter">NurseBot</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto scrollbar-hide">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'hover:bg-slate-800 text-slate-400 font-medium'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <i className={`fa-solid ${item.icon} w-5`}></i>
                <span className="text-sm font-bold">{item.label}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <NavLink to="/chat" className="flex items-center gap-3 p-3 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 mb-4 group">
             <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-xs group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-robot"></i>
             </div>
             <span className="text-xs font-bold text-slate-300">Assistant IA</span>
          </NavLink>
          
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-black text-xs border border-emerald-500/20">
                {session.name[0]}
              </div>
              <div className="text-[10px] min-w-0">
                <p className="font-black text-white uppercase tracking-wider truncate">{session.name}</p>
                <p className="text-emerald-500 font-bold capitalize">{session.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-rose-500 p-2 transition-colors">
               <i className="fa-solid fa-power-off"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-6 md:px-8 shrink-0">
          <div className="md:hidden flex items-center space-x-2">
             <i className="fa-solid fa-user-nurse text-emerald-500 text-xl"></i>
             <span className="font-black tracking-tighter">NurseBot</span>
          </div>
          <div className="flex-1 hidden md:block">
            <div className="flex items-center gap-4">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                session.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                session.role === 'infirmiereAdmin' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                Mode {session.role}
              </span>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-bold text-slate-500">Service {session.name} Connecté</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <NavLink to="/alerts" className="relative p-2 text-slate-400 hover:text-emerald-500 transition-colors">
              <i className="fa-solid fa-bell"></i>
              {unreadAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </NavLink>
            <button onClick={handleLogout} className="md:hidden p-2 text-slate-400 hover:text-rose-500">
              <i className="fa-solid fa-power-off"></i>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-10 pb-24 md:pb-10 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-slate-900 rounded-3xl border border-slate-800 px-6 py-3 flex justify-between items-center z-50 shadow-2xl">
          <NavLink to="/" className={({ isActive }) => `text-lg ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}><i className="fa-solid fa-house"></i></NavLink>
          <NavLink to="/patients" className={({ isActive }) => `text-lg ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}><i className="fa-solid fa-users"></i></NavLink>
          <NavLink to="/chat" className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg -mt-8 border-4 border-slate-50">
             <i className="fa-solid fa-robot"></i>
          </NavLink>
          <NavLink to="/planning" className={({ isActive }) => `text-lg ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}><i className="fa-solid fa-calendar-days"></i></NavLink>
          <NavLink to="/billing" className={({ isActive }) => `text-lg ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}><i className="fa-solid fa-file-invoice-dollar"></i></NavLink>
        </nav>
      </main>
    </div>
  );
};

export default Layout;
