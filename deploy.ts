
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - Déploiement Agile (v2.8)
 * Utilisé UNIQUEMENT pour mettre à jour le code après le setup-vps.
 */

const CONFIG = {
  containerName: 'nursebot',
  appPath: '/opt/nursebot/app',
  distDir: 'dist'
};

const log = (msg: string, emoji = '✨') => console.log(`${emoji} ${msg}`);

async function run() {
  log("Mise à jour rapide du front-end...");

  try {
    process.chdir(CONFIG.appPath);

    log("Récupération du code...");
    execSync("git pull origin main", { stdio: 'inherit' });

    log("Build...");
    execSync("npm install && npm run build", { stdio: 'inherit' });

    log("Permissions...");
    const distPath = path.join(CONFIG.appPath, CONFIG.distDir);
    execSync(`sudo chown -R 33:33 ${distPath}`);
    execSync(`sudo chmod -R 755 ${distPath}`);

    log("Rechargement Nginx...");
    execSync(`docker exec ${CONFIG.containerName} nginx -s reload`, { stdio: 'inherit' });

    log("DÉPLOIEMENT TERMINÉ !", '✅');
  } catch (err: any) {
    console.error("❌ Échec :", err.message);
  }
}

run();
