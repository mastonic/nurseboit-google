
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - VPS Setup (Mode Coexistence)
 * Déploie le front-end sans perturber n8n Hostinger.
 */

const APP_PATH = "/opt/nursebot/app";
const PORT_FRONT = "8080"; // Port différent pour éviter les conflits

const log = (msg: string, emoji = '🚀') => console.log(`\n${emoji} ${msg}`);
const cmd = (command: string) => {
  try {
    return execSync(command, { stdio: 'inherit' });
  } catch (e) {
    console.error(`❌ Erreur lors de l'exécution : ${command}`);
    throw e;
  }
};

async function setup() {
  log("DÉPLOIEMENT DE NURSEBOT - MODE COEXISTENCE", '🛡️');

  try {
    // 1. Vérification de l'environnement
    if (!fs.existsSync(APP_PATH)) {
      log(`Création du dossier ${APP_PATH}`, '📂');
      cmd(`sudo mkdir -p ${APP_PATH}`);
    }
    cmd(`sudo chown -R $USER:$USER ${APP_PATH}`);

    // 2. Installation des dépendances et Build
    log("Installation des dépendances NurseBot...", '📦');
    process.chdir(APP_PATH);
    cmd("npm install");
    
    log("Build de l'application (Génération du dossier dist)...", '⚡');
    cmd("npm run build");

    // 3. Création du Docker Compose dédié à NurseBot
    log(`Génération du docker-compose.nursebot.yml sur le port ${PORT_FRONT}...`, '📝');
    const dockerCompose = `
version: "3.7"
services:
  nursebot-frontend:
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

    // 4. Lancement du conteneur NurseBot
    log("Démarrage du conteneur NurseBot...", '🚢');
    cmd(`docker compose -f ${APP_PATH}/docker-compose.yml up -d --force-recreate`);

    // 5. Réglage des permissions pour Nginx
    log("Réglage des permissions...", '🔐');
    cmd(`sudo chown -R 33:33 ${APP_PATH}/dist`);
    cmd(`sudo chmod -R 755 ${APP_PATH}/dist`);

    // 6. Ouverture du port 8080 dans le pare-feu
    log(`Ouverture du port ${PORT_FRONT} dans UFW...`, '🛡️');
    cmd(`sudo ufw allow ${PORT_FRONT}/tcp || true`);

    log("DÉPLOIEMENT RÉUSSI !", '✅');
    log(`NurseBot est disponible sur : http://votre-ip-vps:${PORT_FRONT}`, '🌐');
    log("Votre installation n8n est restée intacte.", '🤖');

  } catch (err: any) {
    log(`ERREUR : ${err.message}`, '❌');
    process.exit(1);
  }
}

setup();
