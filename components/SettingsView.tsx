
import React, { useState, useEffect } from 'react';
import { getStore, subscribeToStore, updateSettings, getSupabaseClient } from '../services/store.ts';
import { callNurseBotAgent } from '../services/n8nService.ts';

const SettingsView: React.FC = () => {
  const [store, setStore] = useState(getStore());
  const [activeTab, setActiveTab] = useState<'status' | 'n8n' | 'whatsapp' | 'db' | 'check'>('status');
  const [saveStatus, setSaveStatus] = useState<{msg: string, type: 'success' | 'error' | null}>({msg: '', type: null});
  
  const [formData, setFormData] = useState({
    n8nBaseUrl: store.settings.apiConfig.n8nBaseUrl || '',
    n8nApiKey: store.settings.apiConfig.n8nApiKey || '',
    supabaseUrl: store.settings.apiConfig.supabaseUrl || '',
    supabaseKey: store.settings.apiConfig.supabaseKey || '',
    twilioSid: store.settings.apiConfig.twilioSid || '',
    twilioToken: store.settings.apiConfig.twilioToken || '',
    twilioPhone: store.settings.apiConfig.twilioPhone || '',
    whatsappPhone: store.settings.apiConfig.whatsappPhone || '',
    twilioWebhookUrl: store.settings.apiConfig.twilioWebhookUrl || ''
  });

  const [testResults, setTestResults] = useState<any>({
    n8n: { loading: false, status: null, msg: '' },
    db: { loading: false, status: null, msg: '' },
    whatsapp: { loading: false, status: null, msg: '' }
  });

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      updateSettings({
        apiConfig: {
          ...store.settings.apiConfig,
          ...formData
        }
      });
      showToast("Configuration enregistrée avec succès !", "success");
    } catch (err) {
      showToast("Erreur lors de la sauvegarde.", "error");
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setSaveStatus({msg, type});
    setTimeout(() => setSaveStatus({msg: '', type: null}), 3000);
  };

  const runDiagnostics = async () => {
    // 1. Test n8n Orchestrateur
    setTestResults((prev:any) => ({ ...prev, n8n: { ...prev.n8n, loading: true } }));
    try {
      await callNurseBotAgent({ event: 'PING', role: 'admin', message: 'test connection' });
      setTestResults((prev:any) => ({ ...prev, n8n: { loading: false, status: 'ok', msg: 'Connecté' } }));
    } catch (e: any) {
      setTestResults((prev:any) => ({ ...prev, n8n: { loading: false, status: 'error', msg: e.message } }));
    }

    // 2. Test Database
    setTestResults((prev:any) => ({ ...prev, db: { ...prev.db, loading: true } }));
    try {
      const sb = getSupabaseClient();
      if (!sb) throw new Error("Synchro Cloud désactivée");
      const { error } = await sb.from('users').select('count', { count: 'exact', head: true });
      if (error) throw error;
      setTestResults((prev:any) => ({ ...prev, db: { loading: false, status: 'ok', msg: 'Synchro Cloud OK' } }));
    } catch (e: any) {
      setTestResults((prev:any) => ({ ...prev, db: { loading: false, status: 'error', msg: e.message } }));
    }

    // 3. Test WhatsApp Webhook (Alternative CORS test)
    setTestResults((prev:any) => ({ ...prev, whatsapp: { ...prev.whatsapp, loading: true } }));
    if (!formData.twilioWebhookUrl) {
      setTestResults((prev:any) => ({ ...prev, whatsapp: { loading: false, status: 'error', msg: 'URL Webhook manquante' } }));
    } else {
      try {
        const res = await fetch(formData.twilioWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'DIAGNOSTIC', test: true })
        });
        if (res.ok) {
          setTestResults((prev:any) => ({ ...prev, whatsapp: { loading: false, status: 'ok', msg: 'Webhook Réel joignable' } }));
        } else {
          throw new Error(`Status ${res.status}`);
        }
      } catch (e: any) {
        setTestResults((prev:any) => ({ ...prev, whatsapp: { loading: false, status: 'error', msg: `CORS ou Serveur KO: ${e.message}` } }));
      }
    }
  };

  return (
    <div className="space-y-10 pb-32 animate-in fade-in max-w-6xl mx-auto relative">
      {saveStatus.type && (
        <div className={`fixed top-24 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${saveStatus.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          <i className={`fa-solid ${saveStatus.type === 'success' ? 'fa-check-circle' : 'fa-circle-xmark'}`}></i>
          <span className="font-black text-xs uppercase tracking-widest">{saveStatus.msg}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuration Cabinet</h1>
           <p className="text-slate-500 font-medium tracking-tight">Services NurseBot PRO & Canaux WhatsApp</p>
        </div>
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-3xl overflow-x-auto scrollbar-hide max-w-full">
           {[
             { id: 'status', label: 'Infrastructure' },
             { id: 'n8n', label: 'Orchestrateur' },
             { id: 'whatsapp', label: 'Twilio / WA' },
             { id: 'db', label: 'Database' },
             { id: 'check', label: 'Diagnostics' }
           ].map(t => (
             <button 
               key={t.id}
               onClick={() => setActiveTab(t.id as any)} 
               className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-white text-emerald-500 shadow-xl border border-slate-100' : 'text-slate-400'}`}
             >
                {t.label}
             </button>
           ))}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {activeTab === 'status' && (
          <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-[2.5rem] flex items-center justify-between animate-in slide-in-from-bottom-4">
            <div>
              <h3 className="text-emerald-900 font-black text-xl">Serveur Connecté</h3>
              <p className="text-emerald-600 font-bold mt-1">L'application est routée via votre proxy VPS.</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Domaine Actif</p>
              <span className="text-lg font-black text-slate-900">nursebot.srv1146904.hstgr.cloud</span>
            </div>
          </div>
        )}

        {activeTab === 'n8n' && (
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-8 animate-in slide-in-from-bottom-4">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                   <i className="fa-solid fa-diagram-project text-xl"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900">Gateway n8n</h3>
             </div>
             <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Webhook Gateway</label>
                   <input className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={formData.n8nBaseUrl} onChange={(e) => setFormData({...formData, n8nBaseUrl: e.target.value})} placeholder="https://n8n.votredomaine.com/webhook/..." />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clé API n8n</label>
                   <input type="password" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={formData.n8nApiKey} onChange={(e) => setFormData({...formData, n8nApiKey: e.target.value})} placeholder="X-N8N-API-KEY..." />
                </div>
             </div>
             <button type="submit" className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Enregistrer</button>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-8 animate-in slide-in-from-bottom-4">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                   <i className="fa-brands fa-whatsapp text-2xl"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900">Configuration Twilio WhatsApp</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account SID (Twilio)</label>
                   <input className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={formData.twilioSid} onChange={(e) => setFormData({...formData, twilioSid: e.target.value})} placeholder="AC..." />
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auth Token</label>
                   <input type="password" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={formData.twilioToken} onChange={(e) => setFormData({...formData, twilioToken: e.target.value})} />
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Numéro WhatsApp Cabinet</label>
                   <input className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={formData.twilioPhone} onChange={(e) => setFormData({...formData, twilioPhone: e.target.value})} placeholder="whatsapp:+1..." />
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">n8n WhatsApp Webhook URL</label>
                   <input className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={formData.twilioWebhookUrl} onChange={(e) => setFormData({...formData, twilioWebhookUrl: e.target.value})} placeholder="https://..." />
                   <p className="text-[9px] text-slate-400 font-bold italic">Astuce CORS: Utilisez une URL sur le même domaine que NurseBot si possible.</p>
                </div>
             </div>
             <button type="submit" className="px-10 py-5 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-emerald-600 transition-all">Activer WhatsApp Réel</button>
          </div>
        )}

        {activeTab === 'check' && (
          <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 text-white">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-black tracking-tight">Diagnostics de Synchronisation</h3>
                <button type="button" onClick={runDiagnostics} className="px-8 py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">Lancer les tests</button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gateway n8n</span>
                      {testResults.n8n.status === 'ok' ? <i className="fa-solid fa-circle-check text-emerald-500"></i> : testResults.n8n.status === 'error' ? <i className="fa-solid fa-circle-xmark text-rose-500"></i> : <i className="fa-solid fa-circle text-white/10"></i>}
                   </div>
                   <p className="text-xs font-bold text-slate-300 leading-relaxed">{testResults.n8n.loading ? 'Vérification...' : testResults.n8n.msg || 'En attente'}</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base de Données</span>
                      {testResults.db.status === 'ok' ? <i className="fa-solid fa-circle-check text-emerald-500"></i> : testResults.db.status === 'error' ? <i className="fa-solid fa-circle-xmark text-rose-500"></i> : <i className="fa-solid fa-circle text-white/10"></i>}
                   </div>
                   <p className="text-xs font-bold text-slate-300 leading-relaxed">{testResults.db.loading ? 'Vérification...' : testResults.db.msg || 'En attente'}</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Canal WhatsApp</span>
                      {testResults.whatsapp.status === 'ok' ? <i className="fa-solid fa-circle-check text-emerald-500"></i> : testResults.whatsapp.status === 'error' ? <i className="fa-solid fa-circle-xmark text-rose-500"></i> : <i className="fa-solid fa-circle text-white/10"></i>}
                   </div>
                   <p className="text-xs font-bold text-slate-300 leading-relaxed">{testResults.whatsapp.loading ? 'Envoi test...' : testResults.whatsapp.msg || 'Non testé'}</p>
                </div>
             </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default SettingsView;
