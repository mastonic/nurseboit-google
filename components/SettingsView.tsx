import React, { useState, useEffect, useRef } from 'react';
import { getStore, subscribeToStore, updateSettings, getCurrentSession } from '../services/store';
import { ApiConfig } from '../types';

const SettingsView: React.FC = () => {
  const session = getCurrentSession();
  const [store, setStore] = useState(getStore());
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'api' | 'sql'>('api');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const webhookUrlRef = useRef<HTMLInputElement>(null);
  const n8nApiKeyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      setStore(getStore());
    });
  }, []);

  const handleTestConnection = async () => {
    let url = webhookUrlRef.current?.value || store.settings.apiConfig.twilioWebhookUrl;
    let apiKey = n8nApiKeyRef.current?.value || store.settings.apiConfig.n8nApiKey;
    
    if (!url) {
      setTestStatus('error');
      setErrorMessage("L'URL du Webhook est vide. Veuillez saisir une adresse (ex: https://n8n.votre-serveur.fr/webhook/...)");
      webhookUrlRef.current?.focus();
      return;
    }

    // Nettoyage et validation de l'URL
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
      if (webhookUrlRef.current) webhookUrlRef.current.value = url;
    }

    setTestStatus('loading');
    setErrorMessage('');
    
    try {
      console.log(`Tentative de connexion à n8n: ${url}`);
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000); // Timeout 8s

      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-N8N-API-KEY': apiKey
        },
        body: JSON.stringify({ 
          event: 'ping', 
          timestamp: new Date().toISOString(),
          source: 'NurseBot Webapp Test',
          nurse: session?.name || 'Inconnue'
        })
      });

      clearTimeout(id);

      if (response.ok || response.status === 200) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        const errorText = await response.text().catch(() => "Aucun détail d'erreur");
        throw new Error(`Erreur HTTP ${response.status} : ${errorText}`);
      }
    } catch (err: any) {
      console.error("Erreur détaillée test n8n:", err);
      setTestStatus('error');
      
      if (err.name === 'AbortError') {
        setErrorMessage("Délai d'attente dépassé (8s). Le serveur n8n ne répond pas ou l'URL est incorrecte.");
      } else if (err.message === 'Failed to fetch') {
        setErrorMessage(
          "ERREUR RÉSEAU (Failed to fetch). \n\n" +
          "CAUSES PROBABLES :\n" +
          "1. CORS : n8n bloque l'accès depuis ce navigateur. \n   Solution: Réglez N8N_CORS_ALLOWED_ORIGINS=* dans n8n.\n" +
          "2. HTTPS : Vous appelez un serveur http:// depuis ce site en https://. Le navigateur bloque par sécurité.\n" +
          "3. DISPONIBILITÉ : L'URL n'est pas accessible publiquement ou le serveur est éteint.\n\n" +
          "ASTUCE : Testez l'URL dans un outil comme Postman ou via cURL. Si ça marche là-bas, c'est un problème de CORS."
        );
      } else {
        setErrorMessage(err.message);
      }
    }
  };

  const copyCurl = () => {
    const url = webhookUrlRef.current?.value || store.settings.apiConfig.twilioWebhookUrl;
    const apiKey = n8nApiKeyRef.current?.value || store.settings.apiConfig.n8nApiKey;
    const curl = `curl -X POST "${url}" \\
     -H "Content-Type: application/json" \\
     -H "X-N8N-API-KEY: ${apiKey}" \\
     -d '{"event":"ping", "source":"nursebot_curl"}'`;
    
    navigator.clipboard.writeText(curl);
    alert("Commande cURL copiée ! Testez-la dans votre terminal pour vérifier si le serveur répond.");
  };

  const handleUpdateApiConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formElements = e.currentTarget.elements;
    
    const googleSyncEl = formElements.namedItem('googleSync') as HTMLInputElement | null;
    let webhookUrl = formData.get('twilioWebhookUrl') as string || '';
    
    if (webhookUrl && !webhookUrl.startsWith('http')) {
      webhookUrl = 'https://' + webhookUrl;
    }
    
    const newConfig: ApiConfig = {
      twilioSid: formData.get('twilioSid') as string || '',
      twilioToken: formData.get('twilioToken') as string || '',
      twilioPhone: formData.get('twilioPhone') as string || '',
      twilioWebhookUrl: webhookUrl,
      n8nApiKey: formData.get('n8nApiKey') as string || '',
      resendKey: formData.get('resendKey') as string || '',
      googleCalendarSync: googleSyncEl ? googleSyncEl.checked : false
    };
    
    updateSettings({ apiConfig: newConfig });
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const emergencyFixSql = `ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;`;

  if (!session || (session.role !== 'admin' && session.role !== 'infirmiereAdmin')) {
    return <div className="p-10 text-center font-bold text-rose-500">Accès non autorisé.</div>;
  }

  return (
    <div className="space-y-8 pb-20 relative animate-in fade-in duration-500">
      {showSavedToast && (
        <div className="fixed top-20 right-8 z-[100] animate-in slide-in-from-right">
           <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400">
              <i className="fa-solid fa-check-circle text-xl"></i>
              <p className="font-black text-sm uppercase tracking-widest">Configuration Enregistrée</p>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuration</h1>
          <p className="text-slate-500 font-medium">Paramétrage technique & Intégrations</p>
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl shrink-0">
           {(['general', 'team', 'api', 'sql'] as const).map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-emerald-500 shadow-md' : 'text-slate-400'}`}
              >
                 {tab === 'general' ? 'Général' : tab === 'team' ? 'Équipe' : tab === 'api' ? 'n8n / Twilio' : 'SQL'}
              </button>
           ))}
        </div>
      </div>

      {activeTab === 'api' && (
        <div className="space-y-8">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                 <div className="space-y-1">
                    <h3 className="font-black text-xl text-slate-900">Diagnostic de la passerelle n8n</h3>
                    <p className="text-xs text-slate-400 font-medium italic">Testez la connectivité et identifiez les problèmes de CORS.</p>
                 </div>
                 <div className="flex gap-2">
                    <button 
                      onClick={copyCurl}
                      className="px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                       <i className="fa-solid fa-terminal"></i> cURL
                    </button>
                    <button 
                      onClick={handleTestConnection}
                      disabled={testStatus === 'loading'}
                      className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl ${
                        testStatus === 'success' ? 'bg-emerald-500 text-white scale-105 shadow-emerald-200' :
                        testStatus === 'error' ? 'bg-rose-500 text-white animate-shake' :
                        'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                       {testStatus === 'loading' ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-plug"></i>}
                       {testStatus === 'success' ? 'Réussi !' : testStatus === 'error' ? 'Échec' : 'Tester Webhook'}
                    </button>
                 </div>
              </div>

              {testStatus === 'error' && (
                 <div className="mb-6 p-6 bg-rose-50 border-2 border-rose-100 rounded-[1.5rem] animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start gap-4">
                       <i className="fa-solid fa-triangle-exclamation text-rose-500 text-xl mt-1"></i>
                       <div className="space-y-3 flex-1">
                          <p className="text-sm text-rose-800 font-black uppercase tracking-tighter">Échec du test de connexion</p>
                          <div className="bg-white/60 p-4 rounded-xl border border-rose-200">
                            <p className="text-xs text-rose-700 font-bold leading-relaxed whitespace-pre-wrap font-mono">
                               {errorMessage}
                            </p>
                          </div>
                          <div className="flex gap-4 items-center">
                             <a href="https://docs.n8n.io/hosting/configuration/environment-variables/#webhook-variables" target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">
                                <i className="fa-solid fa-book mr-1"></i> Documentation CORS n8n
                             </a>
                             <button onClick={copyCurl} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900">
                                <i className="fa-solid fa-copy mr-1"></i> Copier cURL pour test externe
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                 <p className="text-xs text-slate-500 leading-relaxed font-medium">
                   <i className="fa-solid fa-lightbulb mr-2 text-amber-500"></i>
                   <b>Note sur le 'Failed to fetch' :</b> Cette erreur se produit 99% du temps parce que votre instance n8n n'accepte pas les requêtes cross-origin. Vous devez configurer n8n avec <code>N8N_CORS_ALLOWED_ORIGINS=*</code> pour autoriser NurseBot à lui envoyer des données.
                 </p>
              </div>
           </div>

           <form onSubmit={handleUpdateApiConfig} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                 <h3 className="font-black text-xl text-slate-900 flex items-center gap-3">
                    <i className="fa-brands fa-whatsapp text-emerald-500"></i>
                    WhatsApp / Twilio
                 </h3>
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account SID</label>
                       <input name="twilioSid" placeholder="AC..." defaultValue={store.settings.apiConfig.twilioSid} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro Twilio</label>
                       <input name="twilioPhone" placeholder="whatsapp:+33..." defaultValue={store.settings.apiConfig.twilioPhone} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                    </div>
                 </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                 <h3 className="font-black text-xl text-slate-900 flex items-center gap-3">
                    <i className="fa-solid fa-diagram-project text-indigo-500"></i>
                    Webhooks & Sécurité
                 </h3>
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL Webhook n8n</label>
                       <input 
                         ref={webhookUrlRef}
                         name="twilioWebhookUrl" 
                         placeholder="https://.../webhook/..." 
                         defaultValue={store.settings.apiConfig.twilioWebhookUrl} 
                         className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner" 
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key n8n</label>
                       <input 
                         ref={n8nApiKeyRef}
                         name="n8nApiKey" 
                         type="password"
                         placeholder="Clé secrète X-N8N-API-KEY..." 
                         defaultValue={store.settings.apiConfig.n8nApiKey} 
                         className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner" 
                       />
                    </div>
                    <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                       <input 
                         name="googleSync" 
                         type="checkbox" 
                         defaultChecked={store.settings.apiConfig.googleCalendarSync} 
                         className="w-5 h-5 text-emerald-500 rounded border-slate-300" 
                       />
                       <span className="text-sm font-bold text-slate-700">Synchronisation Calendar</span>
                    </label>
                 </div>
                 <button type="submit" className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 transition-all">
                    Enregistrer la config
                 </button>
              </div>
           </form>
        </div>
      )}

      {activeTab === 'sql' && (
         <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl border-4 border-slate-800">
            <h2 className="text-2xl font-black mb-4 flex items-center gap-3 text-emerald-400">
               <i className="fa-solid fa-database"></i>
               Supabase SQL
            </h2>
            <div className="space-y-6">
               <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                  <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">Correctif rapide</h4>
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <code className="flex-1 p-3 bg-black/60 rounded-xl text-[10px] font-mono text-emerald-300 border border-white/5 w-full overflow-x-auto">{emergencyFixSql}</code>
                    <button onClick={() => { navigator.clipboard.writeText(emergencyFixSql); alert("Copié !"); }} className="w-full md:w-auto px-6 py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-400 transition-colors shrink-0">Copier</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {activeTab === 'general' && (
         <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm max-w-2xl">
            <h3 className="font-black text-2xl mb-8 flex items-center gap-3 text-slate-900">
               <i className="fa-solid fa-hospital text-emerald-500"></i>
               Informations Cabinet
            </h3>
            <div className="space-y-6">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom commercial du cabinet</label>
                  <input placeholder="Ex: Cabinet des Alizés" defaultValue={store.settings.cabinetName} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default SettingsView;