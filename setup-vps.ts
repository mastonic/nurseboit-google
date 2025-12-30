
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - VPS Setup (Mode Coexistence Hostinger)
 * Déploie le front-end NurseBot sans impacter le n8n pré-installé.
 */

const APP_PATH = "/opt/nursebot/app";
const PORT_FRONT = "8080"; 

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
  log("DÉPLOIEMENT NURSEBOT - COMPATIBILITÉ HOSTINGER n8n", '🛡️');

  try {
    // 1. Vérification du dossier
    if (!fs.existsSync(APP_PATH)) {
      cmd(`sudo mkdir -p ${APP_PATH}`);
    }
    cmd(`sudo chown -R $USER:$USER ${APP_PATH}`);

    // 2. Build de l'application
    log("Build de NurseBot (Front-end)...", '📦');
    process.chdir(APP_PATH);
    cmd("npm install");
    cmd("npm run build");

    // 3. Docker Compose dédié (Port 8080)
    log(`Configuration Docker sur le port ${PORT_FRONT}...`, '📝');
    const dockerCompose = `
version: "3.7"
services:
  nursebot-app:
    image: nginx:stable-alpine
    container_name: nursebot-app
    restart: always
    ports:
      - "${PORT_FRONT}:80"
    volumes:
      - ${APP_PATH}/dist:/usr/share/nginx/html:ro
    networks:
      - nursebot-net

networks:
  nursebot-net:
    driver: bridge
`;
    fs.writeFileSync(`${APP_PATH}/docker-compose.yml`, dockerCompose.trim());

    // 4. Lancement
    log("Démarrage du conteneur NurseBot...", '🚢');
    cmd(`docker compose -f ${APP_PATH}/docker-compose.yml up -d --force-recreate`);

    // 5. Permissions Nginx
    cmd(`sudo chown -R 33:33 ${APP_PATH}/dist`);
    cmd(`sudo chmod -R 755 ${APP_PATH}/dist`);

    // 6. Firewall
    log(`Ouverture du port ${PORT_FRONT}...`, '🛡️');
    cmd(`sudo ufw allow ${PORT_FRONT}/tcp || true`);

    log("DÉPLOIEMENT RÉUSSI !", '✅');
    log(`NurseBot : http://votre-ip-vps:${PORT_FRONT}`, '🌐');
    console.log("\nPROCHAINE ÉTAPE : Pour lier votre domaine, tapez :");
    console.log("sudo lsof -i :80");

  } catch (err: any) {
    log(`ERREUR : ${err.message}`, '❌');
    process.exit(1);
  }
}

setup();
