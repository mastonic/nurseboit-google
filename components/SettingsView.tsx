
import React, { useState, useEffect } from 'react';
import { getStore, subscribeToStore } from '../services/store.ts';

const SettingsView: React.FC = () => {
  const [store, setStore] = useState(getStore());
  const [activeTab, setActiveTab] = useState<'status' | 'api'>('status');

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  return (
    <div className="space-y-10 pb-32 animate-in fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuration Cabinet</h1>
           <p className="text-slate-500 font-medium">Gestion du serveur et des accès n8n</p>
        </div>
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-3xl">
           <button 
             onClick={() => setActiveTab('status')} 
             className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'status' ? 'bg-white text-emerald-500 shadow-xl border border-slate-100' : 'text-slate-400'}`}
           >
              Infrastructure
           </button>
           <button 
             onClick={() => setActiveTab('api')} 
             className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'api' ? 'bg-white text-emerald-500 shadow-xl border border-slate-100' : 'text-slate-400'}`}
           >
              APIs & Cloud
           </button>
        </div>
      </div>

      {activeTab === 'status' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-[2.5rem] flex items-center justify-between">
              <div>
                <h3 className="text-emerald-900 font-black text-xl">Serveur Connecté</h3>
                <p className="text-emerald-600 font-bold mt-1">L'application est routée via le proxy n8n.</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Domaine Actif</p>
                <a href="https://nursebot.srv1146904.hstgr.cloud" target="_blank" className="text-lg font-black text-slate-900 hover:underline">nursebot.srv1146904.hstgr.cloud</a>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-6">
              <h3 className="text-xl font-black text-slate-900">Mise à jour du système</h3>
              <p className="text-sm text-slate-500">Pour mettre à jour NurseBot sans interrompre n8n, utilisez la commande suivante en SSH :</p>
              <div className="bg-slate-900 p-6 rounded-2xl font-mono text-[11px] text-emerald-400">
                 cd /opt/nursebot/app && npx tsx deploy.ts
              </div>
           </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-8 animate-in slide-in-from-bottom-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL n8n (Webhook)</label>
                 <input 
                   className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" 
                   value="https://n8n.srv1146904.hstgr.cloud/webhook/nursebot-gateway" 
                   readOnly 
                 />
              </div>
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base de données Cloud</label>
                 <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-400">
                    Supabase : Configurée par variables d'environnement
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
