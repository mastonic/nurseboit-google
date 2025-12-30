
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * NurseBot PRO - Deploy (Mode Coexistence)
 */

const CONFIG = {
  appPath: '/opt/nursebot/app',
  containerName: 'nursebot-app'
};

const log = (msg: string, emoji = '✨') => console.log(`${emoji} ${msg}`);

async function run() {
  log("Mise à jour du front-end NurseBot...");

  try {
    process.chdir(CONFIG.appPath);

    log("Build...");
    execSync("npm run build", { stdio: 'inherit' });

    log("Permissions...");
    execSync(`sudo chown -R 33:33 ${CONFIG.appPath}/dist`);
    execSync(`sudo chmod -R 755 ${CONFIG.appPath}/dist`);

    log("Redémarrage du conteneur...");
    execSync(`docker restart ${CONFIG.containerName}`, { stdio: 'inherit' });

    log("MIS À JOUR AVEC SUCCÈS !", '✅');
  } catch (err: any) {
    console.error("❌ Échec :", err.message);
  }
}

run();
