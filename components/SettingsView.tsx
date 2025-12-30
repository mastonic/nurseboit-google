
import React, { useState, useEffect } from 'react';
import { getStore, subscribeToStore } from '../services/store.ts';

const SettingsView: React.FC = () => {
  const [store, setStore] = useState(getStore());
  const [activeTab, setActiveTab] = useState<'vps' | 'n8n'>('vps');

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copié !");
  };

  const getFixedDockerCompose = () => {
    return `version: "3.7"

services:
  traefik:
    image: "traefik:v2.10"
    restart: always
    container_name: traefik
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.mytlschallenge.acme.tlschallenge=true"
      - "--certificatesresolvers.mytlschallenge.acme.email=admin@srv1146904.hstgr.cloud"
      - "--certificatesresolvers.mytlschallenge.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - traefik_data:/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - web

  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: always
    container_name: n8n
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.n8n.rule=Host(\`n8n.srv1146904.hstgr.cloud\`)"
      - "traefik.http.routers.n8n.entrypoints=websecure"
      - "traefik.http.routers.n8n.tls.certresolver=mytlschallenge"
      - "traefik.http.services.n8n.loadbalancer.server.port=5678"
    environment:
      - N8N_HOST=n8n.srv1146904.hstgr.cloud
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.srv1146904.hstgr.cloud/
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - web

  nursebot:
    image: nginx:stable-alpine
    container_name: nursebot
    restart: always
    volumes:
      - /opt/nursebot/app/dist:/usr/share/nginx/html:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nursebot.rule=Host(\`nursebot.srv1146904.hstgr.cloud\`)"
      - "traefik.http.routers.nursebot.entrypoints=websecure"
      - "traefik.http.routers.nursebot.tls.certresolver=mytlschallenge"
      - "traefik.http.services.nursebot.loadbalancer.server.port=80"
    networks:
      - web

networks:
  web:
    external: false

volumes:
  traefik_data:
  n8n_data:`;
  };

  return (
    <div className="space-y-10 pb-32 animate-in fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Maintenance Serveur</h1>
           <p className="text-slate-500 font-medium tracking-tight">Correction de l'erreur 404 & Page Blanche.</p>
        </div>
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-3xl">
           {['vps', 'n8n'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)} 
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-emerald-500 shadow-xl border border-slate-100' : 'text-slate-400'}`}
              >
                 {tab === 'vps' ? 'Correctif VPS' : 'IA n8n'}
              </button>
           ))}
        </div>
      </div>

      {activeTab === 'vps' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           {/* GUIDE DE RÉPARATION */}
           <div className="bg-emerald-50 border-2 border-emerald-200 p-8 rounded-[2.5rem] space-y-4">
              <h3 className="text-emerald-800 font-black flex items-center gap-3">
                 <i className="fa-solid fa-screwdriver-wrench"></i>
                 Procédure de réparation finale
              </h3>
              <div className="text-xs text-emerald-700 space-y-4 font-bold">
                 <p>1. Copiez le <b>Docker-Compose</b> ci-dessous (j'ai retiré les variables problématiques).</p>
                 <p>2. Lancez <code className="bg-emerald-100 px-2 py-1 rounded">npx tsx deploy.ts</code> (le script ne supprimera plus vos fichiers).</p>
                 <p>3. Redémarrez docker pour valider les routes Traefik.</p>
              </div>
           </div>

           {/* DOCKER COMPOSE SANS VARIABLES */}
           <div className="bg-slate-950 text-white p-10 rounded-[3.5rem] shadow-2xl space-y-8 border border-white/10">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-emerald-400 flex items-center gap-3">
                   <i className="fa-solid fa-box-archive"></i>
                   Fichier docker-compose.yml (Statique)
                </h3>
                <button onClick={() => copyToClipboard(getFixedDockerCompose())} className="text-[10px] font-black text-slate-500 hover:text-white uppercase">Copier</button>
              </div>
              <pre className="bg-black p-6 rounded-3xl text-[10px] font-mono text-emerald-500 overflow-x-auto border border-emerald-500/20 max-h-[500px]">
                {getFixedDockerCompose()}
              </pre>
           </div>

           {/* COMMANDES DE RELANCE */}
           <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-6">
              <h3 className="text-xl font-black text-slate-900">3. Commandes à exécuter</h3>
              <div className="bg-slate-900 p-6 rounded-2xl space-y-3 font-mono text-[11px] text-emerald-400">
                 <p># Appliquer le build corrigé</p>
                 <p>cd /opt/nursebot/app && npx tsx deploy.ts</p>
                 <p className="pt-4"># Redémarrer l'infrastructure</p>
                 <p>docker compose -f /root/docker-compose.yml up -d --force-recreate</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
