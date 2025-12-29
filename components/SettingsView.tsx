
import React, { useState, useEffect } from 'react';
import { getStore, subscribeToStore, updateSettings, getCurrentSession, initStore } from '../services/store';

const SettingsView: React.FC = () => {
  const session = getCurrentSession();
  const [store, setStore] = useState(getStore());
  const [activeTab, setActiveTab] = useState<'general' | 'n8n' | 'db'>('n8n');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [testStatus, setTestStatus] = useState<any>({ supabase: 'idle', n8n: 'idle' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [n8nDetail, setN8nDetail] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const handleUpdateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newConfig = {
      ...store.settings.apiConfig,
      twilioWebhookUrl: (formData.get('n8nUrl') as string).trim(),
      n8nApiKey: (formData.get('n8nKey') as string).trim()
    };
    updateSettings({ apiConfig: newConfig });
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handleTestSystem = async () => {
    setIsRefreshing(true);
    setTestStatus({ supabase: 'loading', n8n: 'loading' });
    setN8nDetail(null);
    
    await performSupabaseTest();
    await performN8NTest();
    
    setIsRefreshing(false);
  };

  const performSupabaseTest = async () => {
    setTestStatus(prev => ({ ...prev, supabase: 'loading' }));
    try { 
      await initStore();
      const currentStatus = getStore().dbStatus;
      setTestStatus(prev => ({ ...prev, supabase: currentStatus === 'connected' ? 'success' : 'error' })); 
    } catch (e) { 
      setTestStatus(prev => ({ ...prev, supabase: 'error' })); 
    }
  };

  const performN8NTest = async () => {
    const n8nUrl = store.settings.apiConfig.twilioWebhookUrl;
    const n8nKey = store.settings.apiConfig.n8nApiKey;

    if (!n8nUrl) {
      setTestStatus(prev => ({ ...prev, n8n: 'idle' }));
      return;
    }

    setTestStatus(prev => ({ ...prev, n8n: 'loading' }));
    try {
      const cleanKey = n8nKey.replace(/[^\x00-\xFF]/g, "").trim();
      const response = await fetch(n8nUrl, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': cleanKey 
        },
        body: JSON.stringify({ 
          event: 'connection_test', 
          source: 'NurseBot_Webapp',
          timestamp: new Date().toISOString() 
        })
      });

      if (response.ok || response.status === 200 || response.status === response.status) {
        setTestStatus(prev => ({ ...prev, n8n: 'success' }));
        setN8nDetail("Le VPS a répondu positivement.");
      } else {
        setTestStatus(prev => ({ ...prev, n8n: 'error' }));
        setN8nDetail(`Erreur HTTP ${response.status} : ${response.statusText}`);
      }
    } catch (e: any) {
      setTestStatus(prev => ({ ...prev, n8n: 'error' }));
      setN8nDetail(e.message || "Impossible de joindre le serveur (CORS ou DNS)");
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'loading') return <i className="fa-solid fa-spinner fa-spin text-slate-400"></i>;
    if (status === 'success') return <i className="fa-solid fa-circle-check text-emerald-500"></i>;
    if (status === 'error') return <i className="fa-solid fa-circle-xmark text-rose-500"></i>;
    return <i className="fa-solid fa-circle text-slate-200"></i>;
  };

  const dbHealth = store.dbHealth || { config: false, network: false, auth: false, tables: false, lastSync: null };

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
                   <div className="flex gap-2">
                     <button 
                        type="button"
                        onClick={performN8NTest}
                        disabled={testStatus.n8n === 'loading'}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                     >
                       <i className={`fa-solid ${testStatus.n8n === 'loading' ? 'fa-spinner fa-spin' : 'fa-bolt'} mr-2`}></i> Tester le tunnel
                     </button>
                   </div>
                </div>
                <form onSubmit={handleUpdateConfig} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Base URL Webhook (Production)</label>
                      <input name="n8nUrl" defaultValue={store.settings.apiConfig.twilioWebhookUrl} placeholder="https://vps-1234.vps.ovh.net/webhook/..." className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner" />
                      <p className="text-[9px] text-slate-400 ml-2 italic">NurseBot enverra les événements (Vocal, OCR, Messages) vers cette URL.</p>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">X-N8N-API-KEY (Sécurité)</label>
                      <input name="n8nKey" type="password" defaultValue={store.settings.apiConfig.n8nApiKey} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-sm shadow-inner" />
                   </div>
                   <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl">Enregistrer & Persister</button>
                </form>
             </div>
          )}

          {activeTab === 'db' && (
             <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-10">
                <div className="flex justify-between items-center">
                   <h3 className="text-xl font-black text-slate-900 flex items-center gap-4">
                      <i className="fa-solid fa-shield-check text-blue-500"></i>
                      Rapport d'Audit Supabase
                   </h3>
                   <div className="flex gap-2">
                     <button 
                        type="button"
                        onClick={performSupabaseTest}
                        disabled={testStatus.supabase === 'loading'}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50"
                     >
                       <i className={`fa-solid ${testStatus.supabase === 'loading' ? 'fa-spinner fa-spin' : 'fa-sync'} mr-2`}></i> Re-vérifier maintenant
                     </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="flex items-center gap-3">
                            <i className={`fa-solid fa-file-code ${dbHealth.config ? 'text-emerald-500' : 'text-slate-300'}`}></i>
                            <span className="text-xs font-bold">Variables (.env)</span>
                         </div>
                         {dbHealth.config ? <i className="fa-solid fa-check-circle text-emerald-500"></i> : <i className="fa-solid fa-circle-exclamation text-amber-500"></i>}
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="flex items-center gap-3">
                            <i className={`fa-solid fa-network-wired ${dbHealth.network ? 'text-emerald-500' : 'text-slate-300'}`}></i>
                            <span className="text-xs font-bold">Liaison Réseau</span>
                         </div>
                         {dbHealth.network ? <i className="fa-solid fa-check-circle text-emerald-500"></i> : <i className="fa-solid fa-circle-xmark text-rose-500"></i>}
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="flex items-center gap-3">
                            <i className={`fa-solid fa-key ${dbHealth.auth ? 'text-emerald-500' : 'text-slate-300'}`}></i>
                            <span className="text-xs font-bold">Authentification</span>
                         </div>
                         {dbHealth.auth ? <i className="fa-solid fa-check-circle text-emerald-500"></i> : <i className="fa-solid fa-circle-xmark text-rose-500"></i>}
                      </div>
                   </div>

                   <div className={`p-8 rounded-[2rem] border flex flex-col justify-center text-center ${store.dbStatus === 'connected' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                      {store.dbStatus === 'connected' ? (
                        <>
                          <div className="text-emerald-500 text-3xl mb-4"><i className="fa-solid fa-circle-check"></i></div>
                          <p className="text-sm font-black text-emerald-900 uppercase">Cabinet Synchronisé</p>
                          <p className="text-[10px] text-emerald-600 font-bold mt-2">Dernier succès : {dbHealth.lastSync ? new Date(dbHealth.lastSync).toLocaleTimeString() : 'Maintenant'}</p>
                        </>
                      ) : (
                        <>
                          <div className="text-rose-500 text-3xl mb-4"><i className="fa-solid fa-triangle-exclamation"></i></div>
                          <p className="text-sm font-black text-rose-900 uppercase">Mode Hors-ligne</p>
                          <p className="text-[9px] text-rose-400 font-bold mt-2 leading-relaxed italic">{store.dbError || "Veuillez configurer vos variables d'environnement."}</p>
                        </>
                      )}
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
                     <div key={stat.l} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-50 text-center group hover:bg-white hover:border-slate-200 transition-all">
                        <i className={`fa-solid ${stat.i} text-slate-300 text-xl mb-3 group-hover:scale-110 transition-transform`}></i>
                        <p className="text-2xl font-black text-slate-900">{stat.v}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.l}</p>
                     </div>
                   ))}
                </div>
             </div>
          )}

          {activeTab === 'general' && (
             <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl text-center space-y-8">
                <i className="fa-solid fa-hospital text-6xl text-slate-100"></i>
                <h3 className="text-2xl font-black text-slate-900">{store.settings.cabinetName}</h3>
                <div className="max-w-md mx-auto space-y-4">
                   <input 
                      onChange={(e) => updateSettings({ cabinetName: e.target.value })}
                      defaultValue={store.settings.cabinetName} 
                      className="w-full p-5 bg-slate-50 rounded-2xl font-black text-center text-xl shadow-inner border-none" 
                   />
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl">
                         <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Version App</p>
                         <p className="text-sm font-black">2.2.3-stable</p>
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
              <h3 className="text-xs font-black uppercase text-emerald-400 tracking-[0.4em] text-center">Diagnostics Globaux</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-xs font-bold">SQL Cloud</span>
                    <StatusIcon status={testStatus.supabase} />
                 </div>
                 <div className="flex flex-col gap-2 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-bold">Passerelle n8n</span>
                       <StatusIcon status={testStatus.n8n} />
                    </div>
                    {n8nDetail && (
                      <p className={`text-[9px] font-medium italic ${testStatus.n8n === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {n8nDetail}
                      </p>
                    )}
                 </div>
              </div>
              <button 
                onClick={handleTestSystem} 
                disabled={isRefreshing} 
                className="w-full py-4 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
              >
                 {isRefreshing ? <i className="fa-solid fa-spinner fa-spin"></i> : "Analyser l'ensemble du système"}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
