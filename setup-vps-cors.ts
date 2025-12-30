
import { execSync } from 'child_process';
import * as fs from 'fs';

/**
 * NurseBot PRO - Déploiement avec Solution Anti-CORS
 * Ce script configure Nginx pour agir comme un proxy vers n8n.
 * Ainsi, le frontend appelle son propre domaine, évitant les preflights CORS.
 */

const APP_PATH = "/opt/nursebot/app";
const DOMAIN = "nursebot.srv1146904.hstgr.cloud";
const N8N_INTERNAL_URL = "http://n8n:5678"; // Nom du service dans le réseau Docker n8n_default

const log = (msg: string, emoji = '🚀') => console.log(`\n${emoji} ${msg}`);

async function deployWithCorsFix() {
  log("NURSEBOT - DÉPLOIEMENT AVEC PROXY ANTI-CORS", '🛡️');

  try {
    // 1. Création de la configuration Nginx optimisée
    log("Génération de la configuration Nginx Proxy...", '📝');
    const nginxConf = `
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Support du routage React
    location / {
        try_files $uri $uri/ /index.html;
    }

    # PROXY ANTI-CORS : Redirection des appels API vers n8n
    # Le frontend appellera /nursebot-gateway au lieu de l'URL complète
    location /nursebot-gateway {
        proxy_pass ${N8N_INTERNAL_URL}/webhook/nursebot-gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # On force les headers CORS ici au cas où
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,X-N8N-API-KEY' always;
    }
}
`;
    fs.writeFileSync(`${APP_PATH}/nginx.conf`, nginxConf.trim());

    // 2. Build de l'application
    log("Build de l'application...", '📦');
    process.chdir(APP_PATH);
    execSync("npm install", { stdio: 'inherit' });
    execSync("npm run build", { stdio: 'inherit' });

    // 3. Mise à jour du Docker Compose
    log("Mise à jour du Docker Compose...", '🐳');
    const dockerCompose = `
services:
  nursebot:
    image: nginx:stable-alpine
    container_name: nursebot-app
    restart: always
    volumes:
      - ${APP_PATH}/dist:/usr/share/nginx/html:ro
      - ${APP_PATH}/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - n8n_default
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nursebot.rule=Host(\`${DOMAIN}\`)"
      - "traefik.http.routers.nursebot.entrypoints=websecure"
      - "traefik.http.routers.nursebot.tls.certresolver=mytlschallenge"
      - "traefik.http.services.nursebot.loadbalancer.server.port=80"

networks:
  n8n_default:
    external: true
`;
    fs.writeFileSync(`${APP_PATH}/docker-compose.yml`, dockerCompose.trim());

    // 4. Redémarrage
    log("Redémarrage des services...", '🚢');
    execSync("docker compose down && docker compose up -d", { stdio: 'inherit' });

    log("DÉPLOIEMENT TERMINÉ !", '✅');
    console.log(`\nConfiguration requise dans l'application :`);
    console.log(`Dans Paramètres > n8n Gateway URL, utilisez désormais :`);
    console.log(`👉 /nursebot-gateway`);
    console.log(`\nL'application passera par le proxy interne sans erreur CORS.`);

  } catch (err: any) {
    console.error(`❌ Erreur critique : ${err.message}`);
    process.exit(1);
  }
}

deployWithCorsFix();
