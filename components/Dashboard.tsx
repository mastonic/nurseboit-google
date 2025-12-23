
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getStore, getCurrentSession } from '../services/store';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const session = getCurrentSession();
  const { prescriptions, invoices, appointments, alerts, messages } = getStore();

  if (!session) return null;

  // Filtrage selon rôle
  const myApts = appointments.filter(a => a.nurseId === session.userId);
  const cabinetApts = appointments;
  const targetApts = session.role === 'admin' ? cabinetApts : myApts;

  const today = new Date().toISOString().split('T')[0];
  const todayAptsCount = targetApts.filter(a => a.dateTime.startsWith(today) && a.status !== 'cancelled').length;
  const cabinetTodayCount = cabinetApts.filter(a => a.dateTime.startsWith(today) && a.status !== 'cancelled').length;

  const expiringScripts = prescriptions.filter(p => p.status !== 'expired' && (session.role === 'admin' || p.createdBy === session.userId)).length;
  const pendingBills = invoices.filter(i => i.status === 'to_prepare' && (session.role !== 'infirmiere')).length;
  const unreadMessages = messages.filter(m => m.direction === 'inbound' && m.status !== 'read').length;

  const stats = [
    { label: session.role === 'admin' ? 'Ordonnances Actives' : 'Mes Ordonnances', value: expiringScripts, color: 'text-blue-600', bg: 'bg-blue-50', icon: 'fa-file-medical', path: '/prescriptions' },
    { label: 'Factures à Préparer', value: pendingBills, color: 'text-amber-600', bg: 'bg-amber-50', icon: 'fa-file-invoice-dollar', path: '/billing', hide: session.role === 'infirmiere' },
    { label: session.role === 'admin' ? 'Passages Cabinet' : 'Mes passages ce jour', value: todayAptsCount, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'fa-calendar-check', path: '/planning' },
    { label: 'Messages non lus', value: unreadMessages, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: 'fa-message', path: '/messages' },
  ].filter(s => !s.hide);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bonjour, {session.name.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 mt-1 font-medium">
            {session.role === 'infirmiere' ? (
              <>Vous avez <span className="text-emerald-600 font-bold">{todayAptsCount} passages</span> prévus aujourd'hui.</>
            ) : (
              <>Le cabinet a <span className="text-emerald-600 font-bold">{cabinetTodayCount} patients</span> ce jour ({todayAptsCount} pour vous).</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={() => navigate('/chat')} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2">
             <i className="fa-solid fa-robot"></i> Assistant IA
           </button>
           {(session.role === 'admin' || session.role === 'infirmiereAdmin') && (
             <button onClick={() => navigate('/billing')} className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-2">
               <i className="fa-solid fa-euro-sign"></i> Facturation
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <button 
            key={stat.label} 
            onClick={() => navigate(stat.path)}
            className={`${stat.bg} p-6 rounded-3xl border border-white shadow-sm transition-all hover:shadow-md hover:scale-[1.03] text-left group`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{stat.label}</p>
                <p className={`text-4xl font-black mt-2 ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`p-4 rounded-2xl bg-white shadow-sm ${stat.color} group-hover:scale-110 transition-transform`}>
                <i className={`fa-solid ${stat.icon} text-xl`}></i>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-bolt text-amber-500"></i>
            Raccourcis {session.role}
          </h2>
          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => navigate('/patients')} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left">
                <i className="fa-solid fa-user-plus text-emerald-500 mb-2"></i>
                <p className="font-bold text-sm">Nouveau Patient</p>
                <p className="text-[10px] text-slate-400 font-medium">Lien avec ma tournée</p>
             </button>
             <button onClick={() => navigate('/prescriptions')} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left">
                <i className="fa-solid fa-expand text-blue-500 mb-2"></i>
                <p className="font-bold text-sm">Scanner Dossier</p>
                <p className="text-[10px] text-slate-400 font-medium">Extraction IA directe</p>
             </button>
             {session.role !== 'infirmiere' && (
               <button onClick={() => navigate('/billing')} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left">
                  <i className="fa-solid fa-file-invoice text-amber-500 mb-2"></i>
                  <p className="font-bold text-sm">Facturer CPAM</p>
                  <p className="text-[10px] text-slate-400 font-medium">Suivi & Rejets</p>
               </button>
             )}
             <button onClick={() => navigate('/planning')} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left">
                <i className="fa-solid fa-calendar-day text-rose-500 mb-2"></i>
                <p className="font-bold text-sm">Ma tournée</p>
                <p className="text-[10px] text-slate-400 font-medium">Consulter mes RDV</p>
             </button>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
           <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
              <i className="fa-solid fa-bell text-rose-500 animate-pulse"></i>
              Alertes urgentes
           </h2>
           <div className="space-y-4">
              {alerts.filter(a => !a.isRead && (!a.userId || a.userId === session.userId)).slice(0, 3).map(alert => (
                 <div key={alert.id} onClick={() => navigate(alert.path)} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-all">
                    <p className="text-xs font-black uppercase text-emerald-400 mb-1">{alert.title}</p>
                    <p className="text-sm font-medium opacity-80">{alert.message}</p>
                 </div>
              ))}
              {alerts.length === 0 && <p className="text-slate-500 text-sm font-medium">Aucune alerte pour le moment.</p>}
           </div>
           <i className="fa-solid fa-shield-heart absolute -right-6 -bottom-6 text-9xl text-white/5 -rotate-12"></i>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
