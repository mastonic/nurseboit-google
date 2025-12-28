
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getStore, getCurrentSession } from '../services/store';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const session = getCurrentSession();
  const { appointments, alerts, messages, transmissions } = getStore();

  if (!session) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const myApts = appointments.filter((a: any) => a.nurseId === session.userId && a.dateTime.startsWith(todayStr));
  const pendingTrans = transmissions.filter((t: any) => t.status === 'sent' && t.fromId !== session.userId);
  
  // Fix: Use process.env instead of import.meta.env to resolve property access error
  const n8nActive = process.env.VITE_N8N_BASE_URL ? 'OK' : 'OFFLINE';

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto px-4 pb-20">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Bonjour, <span className="text-emerald-400">{session.name.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-slate-400 text-lg font-medium max-w-md">
              Il y a <span className="text-white font-bold">{myApts.length} passages</span> dans votre tournée aujourd'hui.
            </p>
            <div className="flex flex-wrap gap-4 mt-8 justify-center md:justify-start">
              <button onClick={() => navigate('/chat')} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-emerald-500/20">
                <i className="fa-solid fa-microphone-lines text-lg"></i> Assistant IA
              </button>
              <button onClick={() => navigate('/planning')} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest backdrop-blur-md transition-all border border-white/10">
                Ma Tournée
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-xl min-w-[280px]">
            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] mb-4">Aujourd'hui</p>
            <div className="text-6xl font-black mb-2 tracking-tighter">
              {myApts.filter((a: any) => a.status === 'done').length}<span className="text-slate-500">/</span>{myApts.length}
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000" 
                style={{ width: `${(myApts.filter((a: any) => a.status === 'done').length / (myApts.length || 1)) * 100}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">Soins terminés</p>
          </div>
        </div>
        <i className="fa-solid fa-notes-medical absolute -right-20 -bottom-20 text-[20rem] text-white/5 -rotate-12 pointer-events-none"></i>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Urgent Priority: Transmissions */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-repeat"></i>
                </div>
                Transmissions en attente
              </h2>
              {pendingTrans.length > 0 && <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">{pendingTrans.length}</span>}
            </div>
            
            <div className="space-y-4">
              {pendingTrans.length > 0 ? pendingTrans.map((t: any) => (
                <div key={t.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col md:flex-row gap-6 hover:bg-rose-50/30 transition-all cursor-pointer group" onClick={() => navigate('/transmissions')}>
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center font-black text-slate-900 group-hover:bg-rose-500 group-hover:text-white transition-all shrink-0">
                    {t.fromName[0]}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-black text-slate-800 text-sm uppercase tracking-wide">{t.fromName} pour le patient ID: {t.patientId}</p>
                    <p className="text-sm text-slate-600 font-medium line-clamp-2 italic leading-relaxed">"{t.text}"</p>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold self-start md:self-center bg-white px-3 py-1 rounded-lg border border-slate-100">
                    {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-slate-300 font-bold italic border-2 border-dashed border-slate-100 rounded-[2rem]">
                  Aucune transmission prioritaire.
                </div>
              )}
            </div>
          </div>

          {/* Quick Appointments Grid */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-calendar-check"></i>
              </div>
              Prochaines Visites
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myApts.filter((a:any) => a.status === 'scheduled').slice(0, 4).map((apt: any) => {
                const patient = getStore().patients.find((p: any) => p.id === apt.patientId);
                return (
                  <div key={apt.id} className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-emerald-300 transition-all flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/patients/${apt.patientId}`)}>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xs">
                      {apt.dateTime.split('T')[1].substring(0, 5)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 truncate uppercase tracking-tight">{patient?.lastName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{patient?.careType}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Status & Alerts Sidebar */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
            <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-widest text-center">Statut Système</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${n8nActive === 'OK' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                   <span className="text-xs font-black text-slate-700">Passerelle VPS</span>
                </div>
                <span className="text-[10px] font-black text-slate-400">{n8nActive}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                   <span className="text-xs font-black text-slate-700">Base Supabase</span>
                </div>
                <span className="text-[10px] font-black text-slate-400">CONNECTÉ</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group cursor-pointer" onClick={() => navigate('/chat')}>
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-950 text-xl shadow-lg">
                <i className="fa-solid fa-robot"></i>
              </div>
              <div>
                <h3 className="text-xl font-black mb-2">Besoin d'aide ?</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  "Prépare la transmission pour Mme Richard" ou "Quels sont mes RDV demain ?"
                </p>
              </div>
            </div>
            <i className="fa-solid fa-brain absolute -right-8 -bottom-8 text-8xl text-white/5 rotate-12 group-hover:scale-110 transition-transform duration-700"></i>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
            <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-widest text-center">Alertes Cabinet</h3>
            <div className="space-y-4">
               {alerts.filter((a:any) => !a.isRead).slice(0, 3).map((a:any) => (
                 <div key={a.id} className="flex gap-4 p-3 hover:bg-slate-50 rounded-xl transition-all cursor-pointer" onClick={() => navigate('/alerts')}>
                    <div className="w-1 h-10 bg-rose-500/20 rounded-full shrink-0"></div>
                    <div>
                       <p className="text-xs font-bold text-slate-800 line-clamp-1">{a.title}</p>
                       <p className="text-[9px] text-slate-400 font-black uppercase mt-1">{new Date(a.date).toLocaleDateString()}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
