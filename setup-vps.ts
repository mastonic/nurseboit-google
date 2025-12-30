
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - VPS Setup Orchestrator (v1.0)
 * Usage: npx tsx setup-vps.ts
 */

const DOMAIN = "srv1146904.hstgr.cloud";
const APP_PATH = "/opt/nursebot/app";
const EMAIL = "admin@srv1146904.hstgr.cloud";

const log = (msg: string, emoji = '🚀') => console.log(`\n${emoji} ${msg}`);
const cmd = (command: string) => {
  try {
    return execSync(command, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Erreur lors de l'exécution : ${command}`);
    throw e;
  }
};

async function setup() {
  log("DÉMARRAGE DE L'INSTALLATION FRESH START - NURSEBOT PRO", '🔥');

  try {
    // 1. Nettoyage initial
    log("Nettoyage des anciens conteneurs...", '🧹');
    try {
      cmd("docker compose -f /root/docker-compose.yml down || true");
      cmd("docker stop nursebot traefik n8n || true");
      cmd("docker rm nursebot traefik n8n || true");
    } catch (e) {}

    // 2. Installation des dépendances système
    log("Mise à jour du système et installation des outils...", '🛠️');
    cmd("sudo apt-get update");
    cmd("sudo apt-get install -y git rsync curl ca-certificates gnupg");

    // 3. Configuration Docker si nécessaire
    log("Vérification de Docker...", '🐳');
    try {
      cmd("docker --version");
    } catch (e) {
      log("Installation de Docker...", '📦');
      cmd("curl -fsSL https://get.docker.com -o get-docker.sh");
      cmd("sh get-docker.sh");
    }

    // 4. Structure des dossiers
    log("Configuration de la structure des dossiers...", '📂');
    if (!fs.existsSync(APP_PATH)) {
      cmd(`sudo mkdir -p ${APP_PATH}`);
    }
    cmd(`sudo chown -R ${process.env.USER || 'root'}:${process.env.USER || 'root'} ${APP_PATH}`);

    // 5. Génération du Docker Compose Master
    log("Génération du fichier docker-compose.yml...", '📝');
    const dockerCompose = `
version: "3.7"

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
      - "--certificatesresolvers.mytlschallenge.acme.email=${EMAIL}"
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
      - "traefik.http.routers.n8n.rule=Host(\`n8n.${DOMAIN}\`)"
      - "traefik.http.routers.n8n.entrypoints=websecure"
      - "traefik.http.routers.n8n.tls.certresolver=mytlschallenge"
      - "traefik.http.services.n8n.loadbalancer.server.port=5678"
    environment:
      - N8N_HOST=n8n.${DOMAIN}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.${DOMAIN}/
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - web

  nursebot:
    image: nginx:stable-alpine
    container_name: nursebot
    restart: always
    volumes:
      - ${APP_PATH}/dist:/usr/share/nginx/html:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nursebot.rule=Host(\`nursebot.${DOMAIN}\`)"
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
  n8n_data:
    `;
    fs.writeFileSync('/root/docker-compose.yml', dockerCompose.trim());

    // 6. Installation Node & Build Front
    log("Installation propre des dépendances Node...", '📦');
    process.chdir(APP_PATH);
    cmd("rm -rf node_modules package-lock.json");
    cmd("npm install");
    
    log("Exécution du Build de production...", '⚡');
    cmd("npm run build");

    // 7. Lancement de l'infrastructure
    log("Démarrage de Docker Compose...", '🚢');
    cmd("docker compose -f /root/docker-compose.yml up -d --force-recreate");

    // 8. Permissions Finales
    log("Réparation finale des permissions...", '🔐');
    cmd(`sudo chown -R 33:33 ${APP_PATH}/dist`);
    cmd(`sudo chmod -R 755 ${APP_PATH}/dist`);

    log("CONFIGURATION TERMINÉE AVEC SUCCÈS !", '✅');
    log(`Accès App : https://nursebot.${DOMAIN}`, '🌐');
    log(`Accès n8n : https://n8n.${DOMAIN}`, '🤖');

  } catch (err: any) {
    log(`ERREUR FATALE : ${err.message}`, '❌');
    process.exit(1);
  }
}

setup();
