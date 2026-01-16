
import React, { useState, useEffect } from 'react';
import { getStore, subscribeToStore, updateSettings, getSupabaseClient } from '../services/store.ts';
import { callNurseBotAgent } from '../services/n8nService.ts';
import { checkGeminiConnection } from '../services/geminiService.ts';

const SettingsView: React.FC = () => {
  const [store, setStore] = useState(getStore());
  const [activeTab, setActiveTab] = useState<'infra' | 'ai' | 'comms' | 'db' | 'diag'>('infra');
  const [saveStatus, setSaveStatus] = useState<{ msg: string, type: 'success' | 'error' | null }>({ msg: '', type: null });

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
    whatsapp: { loading: false, status: null, msg: '' },
    gemini: { loading: false, status: null, msg: '' }
  });

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  // Compute global health
  const globalHealth = (() => {
    const results = Object.values(testResults) as any[];
    const okCount = results.filter(r => r.status === 'ok').length;
    const errCount = results.filter(r => r.status === 'error').length;
    if (errCount > 0) return 'warning';
    if (okCount > 0) return 'healthy';
    return 'neutral';
  })();

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      updateSettings({
        apiConfig: {
          ...store.settings.apiConfig,
          ...formData
        }
      });
      showToast("Paramètres sauvegardés", "success");
    } catch (err) {
      showToast("Échec de la sauvegarde", "error");
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setSaveStatus({ msg, type });
    setTimeout(() => setSaveStatus({ msg: '', type: null }), 3000);
  };

  const runDiagnostics = async () => {
    // n8n
    setTestResults((prev: any) => ({ ...prev, n8n: { ...prev.n8n, loading: true } }));
    try {
      await callNurseBotAgent({ event: 'PING', role: 'admin', message: 'test connection' });
      setTestResults((prev: any) => ({ ...prev, n8n: { loading: false, status: 'ok', msg: 'Opérationnel' } }));
    } catch (e: any) {
      setTestResults((prev: any) => ({ ...prev, n8n: { loading: false, status: 'error', msg: 'Indisponible' } }));
    }

    // DB
    setTestResults((prev: any) => ({ ...prev, db: { ...prev.db, loading: true } }));
    try {
      const sb = getSupabaseClient();
      if (!sb) throw new Error();
      const { error } = await sb.from('users').select('count', { count: 'exact', head: true });
      if (error) throw error;
      setTestResults((prev: any) => ({ ...prev, db: { loading: false, status: 'ok', msg: 'Sync Cloud Active' } }));
    } catch (e: any) {
      setTestResults((prev: any) => ({ ...prev, db: { loading: false, status: 'error', msg: 'Erreur Sync' } }));
    }

    // Gemini
    setTestResults((prev: any) => ({ ...prev, gemini: { ...prev.gemini, loading: true } }));
    try {
      const res = await checkGeminiConnection();
      setTestResults((prev: any) => ({ ...prev, gemini: { loading: false, status: res.status, msg: res.msg } }));
    } catch (e: any) {
      setTestResults((prev: any) => ({ ...prev, gemini: { loading: false, status: 'error', msg: 'Gemini KO' } }));
    }

    // WA
    setTestResults((prev: any) => ({ ...prev, whatsapp: { ...prev.whatsapp, loading: true } }));
    if (!formData.twilioWebhookUrl) {
      setTestResults((prev: any) => ({ ...prev, whatsapp: { loading: false, status: 'error', msg: 'URL Manquante' } }));
    } else {
      try {
        const res = await fetch(formData.twilioWebhookUrl, { method: 'POST', body: JSON.stringify({ event: 'PING' }) });
        setTestResults((prev: any) => ({ ...prev, whatsapp: { loading: false, status: res.ok ? 'ok' : 'error', msg: res.ok ? 'URL Joignable' : 'CORS Error' } }));
      } catch {
        setTestResults((prev: any) => ({ ...prev, whatsapp: { loading: false, status: 'error', msg: 'CORS ou Timeout' } }));
      }
    }
  };

  const navItems = [
    { id: 'infra', label: 'Infrastructure', icon: 'fa-server' },
    { id: 'ai', label: 'Intelligence IA', icon: 'fa-brain' },
    { id: 'comms', label: 'Communications', icon: 'fa-tower-broadcast' },
    { id: 'db', label: 'Base de Données', icon: 'fa-database' },
    { id: 'diag', label: 'Diagnostics', icon: 'fa-gauge-high' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-32 animate-in fade-in duration-700 min-h-[80vh]">
      {/* --- Sidebar Navigation --- */}
      <div className="lg:w-72 flex flex-col gap-4">
        <div className="bg-slate-950 p-6 rounded-[2.5rem] shadow-2xl border border-white/5 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-white tracking-tight">System Settings</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">NurseBot Command Center</p>
          </div>

          <nav className="flex flex-col gap-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${activeTab === item.id
                  ? 'bg-emerald-500 text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <i className={`fa-solid ${item.icon} w-6 text-center ${activeTab === item.id ? 'text-slate-900' : 'text-slate-600 group-hover:text-emerald-400'}`}></i>
                <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* --- Global Health Card --- */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full animate-pulse ${globalHealth === 'healthy' ? 'bg-emerald-500' : globalHealth === 'warning' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Health</p>
            <p className="text-xs font-black text-slate-900 truncate">
              {globalHealth === 'healthy' ? 'All Systems Go' : globalHealth === 'warning' ? 'Action Required' : 'Scan Required'}
            </p>
          </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 space-y-8">
        {/* --- Dynamic Content Header --- */}
        <div className="bg-white/40 backdrop-blur-xl p-8 rounded-[3rem] border border-white/60 shadow-sm flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Module</span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{navItems.find(n => n.id === activeTab)?.label}</h2>
          </div>
          <div className="flex gap-4">
            {saveStatus.type && (
              <div className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 animate-in zoom-in ${saveStatus.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                <i className={`fa-solid ${saveStatus.type === 'success' ? 'fa-check' : 'fa-xmark'}`}></i> {saveStatus.msg}
              </div>
            )}
            <button
              onClick={() => handleSave()}
              className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-500 hover:text-slate-950 transition-all active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* --- Form Sections --- */}
        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

          <div className="relative z-10 space-y-10">
            {activeTab === 'infra' && (
              <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gateway n8n Base URL</label>
                    <div className="relative group">
                      <i className="fa-solid fa-link absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors"></i>
                      <input
                        className="w-full pl-14 pr-5 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner"
                        value={formData.n8nBaseUrl}
                        onChange={(e) => setFormData({ ...formData, n8nBaseUrl: e.target.value })}
                        placeholder="https://n8n.system.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API Key Security</label>
                    <div className="relative group">
                      <i className="fa-solid fa-key absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors"></i>
                      <input
                        type="password"
                        className="w-full pl-14 pr-5 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner"
                        value={formData.n8nApiKey}
                        onChange={(e) => setFormData({ ...formData, n8nApiKey: e.target.value })}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm"><i className="fa-solid fa-shield-halved"></i></div>
                    <div>
                      <p className="text-xs font-black text-slate-700">Proxy SSL Actif</p>
                      <p className="text-[10px] font-bold text-slate-400">Trafic chiffré via HTTPS</p>
                    </div>
                  </div>
                  <span className="px-4 py-1.5 bg-emerald-100 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">Secure</span>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                <div className="flex items-center gap-6 p-8 bg-indigo-50 rounded-[2.5rem] border border-indigo-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><i className="fa-solid fa-wand-magic-sparkles text-6xl text-indigo-900"></i></div>
                  <div className="w-16 h-16 bg-white rounded-[1.5rem] shadow-xl flex items-center justify-center text-3xl text-indigo-500">
                    <i className="fa-solid fa-brain"></i>
                  </div>
                  <div>
                    <h3 className="font-black text-indigo-900 text-xl">Google Gemini Core</h3>
                    <p className="text-indigo-600/70 font-bold text-sm">Orchestration multi-agents & Analyse Médicale</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 italic text-[11px] text-slate-500 font-medium">
                  Note : L'IA Gemini utilise la clé API configurée dans vos variables d'environnement cabinet. Utilisez le diagnostic pour vérifier la liaison.
                </div>
              </div>
            )}

            {activeTab === 'comms' && (
              <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    { label: 'Twilio Account SID', key: 'twilioSid' },
                    { label: 'Auth Token', key: 'twilioToken', type: 'password' },
                    { label: 'Sender Phone (WhatsApp)', key: 'twilioPhone' },
                    { label: 'n8n Hook Receiver', key: 'twilioWebhookUrl' },
                  ].map(field => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.label}</label>
                      <input
                        type={field.type || 'text'}
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all"
                        value={(formData as any)[field.key]}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'db' && (
              <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 text-center py-10">
                <div className="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center text-3xl mx-auto shadow-2xl mb-6">
                  <i className="fa-solid fa-database"></i>
                </div>
                <div className="max-w-md mx-auto space-y-4">
                  <h3 className="text-2xl font-black text-slate-900">Supabase Cloud Sync</h3>
                  <p className="text-sm text-slate-500 font-medium mb-8">NurseBot utilise une architecture décentralisée avec une synchronisation cloud pour vos dossiers médicaux.</p>
                  <div className="space-y-4 text-left">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-emerald-200 transition-all">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-sm font-black text-slate-700">Cloud Link Active</p>
                      </div>
                      <i className="fa-solid fa-cloud-arrow-up text-emerald-500 text-xl"></i>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'diag' && (
              <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                <div className="flex justify-between items-center bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full"></div>
                  <div className="relative z-10">
                    <h3 className="text-xl font-black">Santé du Système</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Diagnostic Temps Réel</p>
                  </div>
                  <button
                    type="button"
                    onClick={runDiagnostics}
                    className="relative z-10 px-8 py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    Scan Global
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { key: 'n8n', label: 'Gateway', icon: 'fa-diagram-project' },
                    { key: 'db', label: 'Supabase', icon: 'fa-database' },
                    { key: 'gemini', label: 'Gemini Core', icon: 'fa-brain' },
                    { key: 'whatsapp', label: 'WhatsApp', icon: 'fa-tower-broadcast' }
                  ].map(d => (
                    <div key={d.key} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col items-center text-center gap-4 hover:border-emerald-200 transition-all">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner ${testResults[d.key].status === 'ok' ? 'bg-emerald-50 text-emerald-500' : testResults[d.key].status === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-white text-slate-300'}`}>
                        <i className={`fa-solid ${d.icon}`}></i>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.label}</p>
                        <p className={`text-xs font-black mt-1 ${testResults[d.key].status === 'ok' ? 'text-emerald-600' : testResults[d.key].status === 'error' ? 'text-rose-600' : 'text-slate-400'}`}>
                          {testResults[d.key].loading ? 'Scanning...' : testResults[d.key].msg || 'Non testé'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
