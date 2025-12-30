
import { execSync } from 'child_process';
import * as fs from 'fs';

/**
 * NurseBot PRO - Final Setup (Option B)
 * Intégration au réseau n8n_default pour routage par domaine.
 */

const APP_PATH = "/opt/nursebot/app";
const DOMAIN = "nursebot.srv1146904.hstgr.cloud";
const PORT_LOCAL = "8080";

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
  log("NURSEBOT - CONFIGURATION DOMAINE SSL", '🛡️');

  try {
    // 1. Build
    log("Build de l'application...", '📦');
    process.chdir(APP_PATH);
    cmd("npm install");
    cmd("npm run build");

    // 2. Docker Compose (Intégration Traefik Hostinger)
    log(`Génération du Docker Compose pour ${DOMAIN}...`, '📝');
    const dockerCompose = `
version: "3.7"
services:
  nursebot:
    image: nginx:stable-alpine
    container_name: nursebot-app
    restart: always
    ports:
      - "${PORT_LOCAL}:80"
    volumes:
      - ${APP_PATH}/dist:/usr/share/nginx/html:ro
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

    // 3. Lancement
    log("Démarrage du conteneur...", '🚢');
    cmd(`docker compose -f ${APP_PATH}/docker-compose.yml up -d --force-recreate`);

    // 4. Permissions finalisées
    cmd(`sudo chmod -R 755 ${APP_PATH}/dist`);

    log("CONFIGURATION RÉUSSIE !", '✅');
    console.log(`\n1. Votre application devrait être accessible sur :`);
    console.log(`👉 https://${DOMAIN}`);
    console.log(`\n(Si le SSL met quelques minutes à arriver, testez sur http://${DOMAIN})`);

  } catch (err: any) {
    log(`ERREUR : ${err.message}`, '❌');
    process.exit(1);
  }
}

setup();
