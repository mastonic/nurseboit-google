
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getStore, getCurrentSession, getActiveUserCount, subscribeToStore } from '../services/store';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const session = getCurrentSession();
  const [store, setStore] = React.useState(getStore());

  React.useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const { appointments, alerts, messages, transmissions, invoices, patients, prescriptions, settings } = store;

  if (!session) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const myApts = appointments.filter((a: any) => a.nurseId === session.userId && a.dateTime.startsWith(todayStr));
  const doneApts = myApts.filter((a: any) => a.status === 'done').length;
  const recentTransmissions = [...transmissions].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 4);
  const unreadMessages = messages.filter(m => m.direction === 'inbound' && m.status !== 'read').length;
  const expiringPresc = prescriptions.filter(p => p.status === 'expiring' || p.status === 'expired').length;
  const activeUsers = getActiveUserCount();
  const isAdmin = session.role === 'admin' || session.role === 'infirmiereAdmin';

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">

      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Bonjour {session.name.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 font-medium text-lg mt-1 italic opacity-70">"Prenez soin de vous pour mieux soigner les autres."</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/chat')} className="px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
            <i className="fa-solid fa-wand-magic-sparkles"></i> Assistant IA
          </button>
        </div>
      </div>

      {/* Main Grid: KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Passages du jour', value: `${doneApts}/${myApts.length}`, icon: 'fa-calendar-check', color: 'bg-blue-500', path: '/planning' },
          { label: 'Transmissions', value: transmissions.length, icon: 'fa-clipboard-list', color: 'bg-amber-500', path: '/transmissions' },
          { label: 'Messages non lus', value: unreadMessages, icon: 'fa-whatsapp', color: 'bg-emerald-500', path: '/messages' },
          { label: 'Ordonnances', value: expiringPresc, icon: 'fa-file-medical', color: 'bg-rose-500', path: '/prescriptions', alert: expiringPresc > 0 },
          { label: 'Staff Connecté', value: activeUsers, icon: 'fa-user-clock', color: 'bg-indigo-500', path: '/meetings' },
        ].map((kpi, i) => (
          <div
            key={i}
            onClick={() => navigate(kpi.path)}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className={`w-14 h-14 ${kpi.color} text-white rounded-2xl flex items-center justify-center text-xl mb-6 shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-6`}>
              <i className={`fa-solid ${kpi.icon}`}></i>
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{kpi.value}</h3>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{kpi.label}</p>
            {kpi.alert && (
              <span className="absolute top-8 right-8 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Left Column: Tournée & Activity */}
        <div className="lg:col-span-2 space-y-10">

          {/* Tournée Card */}
          <section className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
            <div className="p-8 md:p-10 flex justify-between items-center border-b border-slate-50 bg-slate-50/30">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <i className="fa-solid fa-route text-blue-500"></i> Tournée du jour
              </h2>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{myApts.length} passages</span>
            </div>
            <div className="p-4 space-y-4">
              {myApts.slice(0, 5).map(a => {
                const p = patients.find(pat => pat.id === a.patientId);
                return (
                  <div key={a.id} onClick={() => navigate(`/patients/${p?.id}`)} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-[2rem] border border-transparent hover:border-blue-100 hover:bg-white hover:shadow-lg transition-all cursor-pointer group">
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-black text-slate-900">{a.dateTime.split('T')[1].substring(0, 5)}</span>
                      <div className="h-8 w-[1px] bg-slate-200"></div>
                      <div>
                        <p className="text-md font-black text-slate-800 group-hover:text-blue-600">{p?.lastName} {p?.firstName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{p?.careType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.status === 'done' && <i className="fa-solid fa-circle-check text-emerald-500"></i>}
                      <i className="fa-solid fa-chevron-right text-slate-200 text-[10px] group-hover:translate-x-1 transition-transform"></i>
                    </div>
                  </div>
                )
              })}
              {myApts.length === 0 && <p className="text-center py-10 text-slate-300 italic">Aucun passage pour aujourd'hui.</p>}
              <button onClick={() => navigate('/planning')} className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Voir tout le planning</button>
            </div>
          </section>

          {/* Transmissions Card */}
          <section className="bg-slate-900 text-white rounded-[3rem] shadow-2xl overflow-hidden p-10 relative">
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black tracking-tight">Dernières Transmissions</h2>
                <button onClick={() => navigate('/transmissions')} className="text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:underline">Consulter</button>
              </div>
              <div className="space-y-4">
                {recentTransmissions.map(t => (
                  <div key={t.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-3 hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">DE: {t.fromName}</span>
                      <span className="text-[9px] font-bold text-slate-500">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-300 line-clamp-2 italic">"{t.text}"</p>
                  </div>
                ))}
              </div>
            </div>
            <i className="fa-solid fa-clipboard-list absolute -right-20 -bottom-20 text-[20rem] text-white/5 -rotate-12 pointer-events-none"></i>
          </section>

        </div>

        {/* Right Column: Alerts & Status */}
        <div className="space-y-10">

          {/* Alerts Card */}
          <section className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-xl">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <i className="fa-solid fa-bell text-rose-500"></i> Centre d'alertes
            </h3>
            <div className="space-y-4">
              {alerts.filter(a => !a.isRead).slice(0, 4).map(alert => (
                <div key={alert.id} onClick={() => navigate(alert.path)} className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100 hover:bg-rose-50 transition-all cursor-pointer group">
                  <h4 className="text-sm font-black text-rose-900 mb-1">{alert.title}</h4>
                  <p className="text-xs text-rose-600 font-medium opacity-80 leading-snug">{alert.message}</p>
                </div>
              ))}
              {alerts.filter(a => !a.isRead).length === 0 && <p className="text-center py-8 text-slate-300 italic text-sm">Aucune alerte en cours.</p>}
            </div>
          </section>

          {/* WhatsApp Connectivity */}
          <section className="bg-emerald-500 p-10 rounded-[3.5rem] text-white shadow-2xl shadow-emerald-500/20 group relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl">
                <i className="fa-brands fa-whatsapp"></i>
              </div>
              <h3 className="text-2xl font-black leading-none">Canal WhatsApp</h3>
              <p className="text-emerald-100 text-sm font-medium leading-relaxed opacity-90">
                {/* Fix: use 'settings' instead of 'store.settings' */}
                Le simulateur est prêt. {settings.apiConfig.twilioWebhookUrl ? 'Le webhook réel est configuré.' : 'Configurez Twilio pour envoyer de vrais messages.'}
              </p>
              <button onClick={() => navigate('/settings')} className="px-6 py-3 bg-white text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">
                Paramétrer
              </button>
            </div>
            <i className="fa-solid fa-signal absolute -right-6 -bottom-6 text-9xl text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-1000"></i>
          </section>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
