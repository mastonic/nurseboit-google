import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getStore, getCurrentSession } from '../services/store';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const session = getCurrentSession();
  const { appointments, alerts, messages, transmissions, invoices, patients, prescriptions } = getStore();

  if (!session) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const myApts = appointments.filter((a: any) => a.nurseId === session.userId && a.dateTime.startsWith(todayStr));
  const doneApts = myApts.filter((a: any) => a.status === 'done').length;
  const recentActivity = [...transmissions].sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6);
  const unreadMessages = messages.filter(m => m.direction === 'inbound' && m.status !== 'read').length;
  
  // Calcul des ordonnances à risque (expirant bientôt ou expirées)
  const expiringPresc = prescriptions.filter(p => p.status === 'expiring' || p.status === 'expired').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header Section: Minimal & Professional */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tableau de bord</h1>
          <p className="text-slate-500 font-medium">Bienvenue, {session.name}. Voici le résumé de votre activité.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/planning')} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            Exporter PDF
          </button>
          <button onClick={() => navigate('/chat')} className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            <i className="fa-solid fa-plus text-[10px]"></i> Assistant IA
          </button>
        </div>
      </div>

      {/* KPI Cards: Updated to 5 Column Grid for Premium SaaS look */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Passages', value: `${doneApts}/${myApts.length}`, sub: 'Tournée du jour', icon: 'fa-calendar-check', color: 'text-blue-500', bg: 'bg-blue-50', path: '/planning' },
          { label: 'Transmissions', value: transmissions.length, sub: 'Dernières 24h', icon: 'fa-clipboard-list', color: 'text-amber-500', bg: 'bg-amber-50', path: '/transmissions' },
          { label: 'Ordonnances', value: expiringPresc, sub: 'À renouveler', icon: 'fa-file-prescription', color: 'text-rose-500', bg: 'bg-rose-50', path: '/prescriptions', alert: expiringPresc > 0 },
          { label: 'Messages', value: unreadMessages, sub: 'WhatsApp patients', icon: 'fa-whatsapp', color: 'text-emerald-500', bg: 'bg-emerald-50', path: '/messages' },
          { label: 'Factures', value: invoices.length, sub: 'Dossiers actifs', icon: 'fa-file-invoice-dollar', color: 'text-purple-500', bg: 'bg-purple-50', path: '/billing' },
        ].map((kpi, i) => (
          <div 
            key={i} 
            onClick={() => navigate(kpi.path)}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-11 h-11 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center text-lg transition-transform group-hover:scale-110`}>
                <i className={`fa-solid ${kpi.icon}`}></i>
              </div>
              {kpi.alert && (
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{kpi.value}</h3>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{kpi.label}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-3">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Feed: Recent Activity (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Activité récente</h2>
            <button onClick={() => navigate('/transmissions')} className="text-[11px] font-black text-emerald-500 uppercase tracking-widest hover:underline">Tout voir</button>
          </div>
          <div className="flex-1">
            {recentActivity.map((t: any, i) => {
              const patient = patients.find(p => p.id === t.patientId);
              return (
                <div key={t.id} className={`p-6 flex items-center gap-6 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0`}>
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400 shrink-0">
                    {patient?.lastName[0] || 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm">{patient?.lastName} {patient?.firstName}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{t.text}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${t.priority === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                      {t.category}
                    </span>
                  </div>
                </div>
              );
            })}
            {recentActivity.length === 0 && (
              <div className="p-20 text-center">
                 <p className="text-slate-400 text-sm italic font-medium">Aucune activité récente.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Upcoming & Alerts (1/3 width) */}
        <div className="space-y-8">
          
          {/* Upcoming Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
              <i className="fa-solid fa-clock text-emerald-500 text-sm"></i> 
              Prochaines visites
            </h3>
            <div className="space-y-4">
              {myApts.filter(a => a.status === 'scheduled').slice(0, 4).map(a => {
                const p = patients.find(pat => pat.id === a.patientId);
                return (
                  <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-emerald-100 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-slate-900">{a.dateTime.split('T')[1].substring(0, 5)}</span>
                      <p className="text-sm font-bold text-slate-700 group-hover:text-emerald-600">{p?.lastName}</p>
                    </div>
                    <i className="fa-solid fa-chevron-right text-slate-200 text-[10px] group-hover:translate-x-1 transition-transform"></i>
                  </div>
                );
              })}
              {myApts.filter(a => a.status === 'scheduled').length === 0 && (
                <p className="text-center py-8 text-xs text-slate-400 font-medium italic">Aucune visite prévue.</p>
              )}
            </div>
            <button onClick={() => navigate('/planning')} className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Planning complet</button>
          </div>

          {/* Alert Center */}
          <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-lg font-black leading-tight mb-2">Centre de coordination</h3>
              <p className="text-emerald-100 text-xs font-medium leading-relaxed opacity-90">
                Vous avez {alerts.filter(a => !a.isRead).length} notifications en attente de traitement.
              </p>
              <button onClick={() => navigate('/alerts')} className="mt-6 px-6 py-2.5 bg-white text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">
                Consulter
              </button>
            </div>
            <i className="fa-solid fa-bell absolute -right-6 -bottom-6 text-7xl text-white/10 -rotate-12 group-hover:rotate-0 transition-transform duration-700"></i>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;