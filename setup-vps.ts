
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - VPS Setup Orchestrator (v1.2)
 * Correction Conflit Port 80
 */

const DOMAIN = "srv1146904.hstgr.cloud";
const APP_PATH = "/opt/nursebot/app";
const EMAIL = "admin@srv1146904.hstgr.cloud";

const log = (msg: string, emoji = '🚀') => console.log(`\n${emoji} ${msg}`);
const cmd = (command: string) => {
  try {
    return execSync(command, { stdio: 'inherit' });
  } catch (e) {
    console.error(`❌ Erreur : ${command}`);
    throw e;
  }
};

async function setup() {
  log("INITIALISATION COMPLÈTE DU VPS - NURSEBOT PRO", '🔥');

  try {
    // 0. LIBÉRATION DES PORTS (Crucial pour Traefik)
    log("Libération des ports 80 et 443...", '🔓');
    try {
      cmd("sudo systemctl stop nginx || true");
      cmd("sudo systemctl disable nginx || true");
      cmd("sudo systemctl stop apache2 || true");
      cmd("sudo systemctl disable apache2 || true");
      // On tue tout processus qui écoute encore sur le port 80
      cmd("sudo fuser -k 80/tcp || true");
      cmd("sudo fuser -k 443/tcp || true");
    } catch (e) {
      log("Ports déjà libres ou outils fuser manquants.", 'ℹ️');
    }

    // 1. Préparation Système
    log("Mise à jour du système...", '🛠️');
    cmd("sudo apt-get update && sudo apt-get upgrade -y");
    cmd("sudo apt-get install -y git rsync curl ca-certificates gnupg ufw psmisc");

    // 2. Pare-feu (Sécurité IDEL)
    log("Configuration du pare-feu...", '🛡️');
    cmd("sudo ufw allow 22/tcp");
    cmd("sudo ufw allow 80/tcp");
    cmd("sudo ufw allow 443/tcp");
    cmd("sudo ufw --force enable");

    // 3. Installation Docker
    log("Vérification Docker...", '🐳');
    try {
      cmd("docker --version");
    } catch {
      cmd("curl -fsSL https://get.docker.com -o get-docker.sh");
      cmd("sudo sh get-docker.sh");
      cmd("sudo usermod -aG docker $USER");
    }

    // 4. Structure des dossiers
    log("Dossiers...", '📂');
    if (!fs.existsSync(APP_PATH)) {
      cmd(`sudo mkdir -p ${APP_PATH}`);
    }
    cmd(`sudo chown -R $USER:$USER ${APP_PATH}`);

    // 5. Docker Compose
    log("Génération docker-compose.yml...", '📝');
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

    // 6. Build
    log("Build Front...", '⚡');
    process.chdir(APP_PATH);
    cmd("npm install && npm run build");

    // 7. Start
    log("Démarrage Docker Compose...", '🚢');
    // On force l'arrêt des conteneurs qui pourraient être dans un état instable
    cmd("sudo docker compose -f /root/docker-compose.yml down || true");
    cmd("sudo docker compose -f /root/docker-compose.yml up -d");

    // 8. Permissions
    log("Permissions...", '🔐');
    cmd(`sudo chown -R 33:33 ${APP_PATH}/dist`);
    cmd(`sudo chmod -R 755 ${APP_PATH}/dist`);

    log("TERMINÉ !", '✅');
    log(`App : https://nursebot.${DOMAIN}`, '🌐');

  } catch (err: any) {
    log(`ERREUR FATALE : ${err.message}`, '❌');
    process.exit(1);
  }
}

setup();
