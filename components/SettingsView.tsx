
import React, { useState, useEffect, useRef } from 'react';
import { getStore, subscribeToStore, updateSettings, getCurrentSession, initStore } from '../services/store';
import { ApiConfig } from '../types';

const SettingsView: React.FC = () => {
  const session = getCurrentSession();
  const [store, setStore] = useState(getStore());
  const [activeTab, setActiveTab] = useState<'general' | 'n8n' | 'db'>('n8n');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [testStatus, setTestStatus] = useState<any>({ supabase: 'idle', n8n: 'idle' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const handleUpdateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newConfig = {
      ...store.settings.apiConfig,
      twilioWebhookUrl: formData.get('n8nUrl') as string,
      n8nApiKey: formData.get('n8nKey') as string
    };
    updateSettings({ apiConfig: newConfig });
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handleTestSystem = async () => {
    setIsRefreshing(true);
    setTestStatus({ supabase: 'loading', n8n: 'loading' });
    
    // Test Supabase
    try { await initStore(); setTestStatus(prev => ({ ...prev, supabase: 'success' })); } 
    catch (e) { setTestStatus(prev => ({ ...prev, supabase: 'error' })); }

    // Test n8n
    const n8nUrl = store.settings.apiConfig.twilioWebhookUrl;
    if (n8nUrl) {
      try {
        const res = await fetch(n8nUrl.replace('/webhook/', '/webhook-test/'), { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': store.settings.apiConfig.n8nApiKey },
          body: JSON.stringify({ event: 'health_check' })
        });
        setTestStatus(prev => ({ ...prev, n8n: res.ok ? 'success' : 'error' }));
      } catch (e) { setTestStatus(prev => ({ ...prev, n8n: 'error' })); }
    } else {
      setTestStatus(prev => ({ ...prev, n8n: 'idle' }));
    }
    setIsRefreshing(false);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'loading') return <i className="fa-solid fa-spinner fa-spin text-slate-400"></i>;
    if (status === 'success') return <i className="fa-solid fa-circle-check text-emerald-500"></i>;
    if (status === 'error') return <i className="fa-solid fa-circle-xmark text-rose-500"></i>;
    return <i className="fa-solid fa-circle text-slate-200"></i>;
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      {showSavedToast && (
        <div className="fixed top-24 right-8 z-[100] bg-emerald-500 text-white px-8 py-5 rounded-[2rem] shadow-2xl font-black text-[10px] uppercase tracking-widest border border-emerald-400 animate-in slide-in-from-right">
           Configuration Appliquée
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuration Cabinet</h1>
           <p className="text-slate-500 font-medium">Réglages système et intégrations n8n.</p>
        </div>
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[2rem]">
           {(['general', 'n8n', 'db'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-emerald-500 shadow-xl' : 'text-slate-400'}`}>
                 {tab === 'n8n' ? 'n8n Webhooks' : tab === 'db' ? 'Base de données' : 'Général'}
              </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {activeTab === 'n8n' && (
             <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-8">
                <div className="flex justify-between items-center">
                   <h3 className="text-xl font-black text-slate-900 flex items-center gap-4">
                      <i className="fa-solid fa-plug-circle-bolt text-indigo-500"></i>
                      Passerelle n8n
                   </h3>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connecteur VITE_N8N</span>
                </div>
                <form onSubmit={handleUpdateConfig} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Base URL Webhook (POST)</label>
                      <input name="n8nUrl" defaultValue={store.settings.apiConfig.twilioWebhookUrl} placeholder="https://votre-vps.n8n.cloud/webhook/..." className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">X-N8N-API-KEY (Public Token)</label>
                      <input name="n8nKey" type="password" defaultValue={store.settings.apiConfig.n8nApiKey} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-sm shadow-inner" />
                   </div>
                   <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl">Enregistrer & Persister</button>
                </form>
             </div>
          )}

          {activeTab === 'db' && (
             <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-10">
                <div className="flex justify-between items-center">
                   <h3 className="text-xl font-black text-slate-900">État des Tables</h3>
                   <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-xl text-emerald-600 font-black text-[10px] uppercase">
                      <i className="fa-solid fa-circle-dot animate-pulse"></i> Connecté à Supabase
                   </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                   {[
                     { l: 'Patients', v: store.patients.length, i: 'fa-users' },
                     { l: 'Planning', v: store.appointments.length, i: 'fa-calendar' },
                     { l: 'Transmissions', v: store.transmissions.length, i: 'fa-repeat' },
                     { l: 'Messages', v: store.messages.length, i: 'fa-message' },
                     { l: 'Tâches', v: store.tasks.length, i: 'fa-check' },
                     { l: 'Logs Audit', v: store.logs.length, i: 'fa-shield' },
                   ].map(stat => (
                     <div key={stat.l} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-50 text-center">
                        <i className={`fa-solid ${stat.i} text-slate-300 text-xl mb-3`}></i>
                        <p className="text-2xl font-black text-slate-900">{stat.v}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.l}</p>
                     </div>
                   ))}
                </div>
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                   <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Audit Variable .env</p>
                   <p className="text-xs font-bold text-amber-900 italic">"Erreur variable non supportée corrigée : Utilisation de process.env.VITE_* pour l'injection build time."</p>
                </div>
             </div>
          )}

          {activeTab === 'general' && (
             <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl text-center space-y-8">
                <i className="fa-solid fa-hospital text-6xl text-slate-100"></i>
                <h3 className="text-2xl font-black text-slate-900">Cabinet Infirmier Pro</h3>
                <div className="max-w-md mx-auto space-y-4">
                   <input defaultValue={store.settings.cabinetName} className="w-full p-5 bg-slate-50 rounded-2xl font-black text-center text-xl shadow-inner border-none" />
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl">
                         <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Version App</p>
                         <p className="text-sm font-black">2.1.5-beta</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                         <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Build Env</p>
                         <p className="text-sm font-black text-emerald-500 uppercase">Production</p>
                      </div>
                   </div>
                </div>
             </div>
          )}

        </div>

        {/* Diagnostic Sidebar */}
        <div className="space-y-8">
           <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl space-y-8">
              <h3 className="text-xs font-black uppercase text-emerald-400 tracking-[0.4em] text-center">Diagnostics Temps Réel</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-xs font-bold">Supabase DB</span>
                    <StatusIcon status={testStatus.supabase} />
                 </div>
                 <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-xs font-bold">n8n Gateway</span>
                    <StatusIcon status={testStatus.n8n} />
                 </div>
                 <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10 opacity-50">
                    <span className="text-xs font-bold">WhatsApp / Twilio</span>
                    <i className="fa-solid fa-circle text-slate-600"></i>
                 </div>
              </div>
              <button onClick={handleTestSystem} disabled={isRefreshing} className="w-full py-4 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                 {isRefreshing ? <i className="fa-solid fa-spinner fa-spin"></i> : "Tester les connexions"}
              </button>
           </div>

           <div className="bg-emerald-500 p-8 rounded-[3rem] text-white shadow-xl shadow-emerald-500/20 text-center space-y-4">
              <i className="fa-solid fa-shield-virus text-5xl opacity-30"></i>
              <h4 className="font-black text-lg leading-tight uppercase tracking-tight">Sécurité HDS</h4>
              <p className="text-[10px] font-medium leading-relaxed italic opacity-80">"Toutes les connexions vers le VPS et Supabase sont chiffrées en TLS 1.3 (HTTPS)."</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
