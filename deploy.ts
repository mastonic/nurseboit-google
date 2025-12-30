
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - Script de Déploiement "Ultra-Stable" (Version 2.5)
 */

const CONFIG = {
  containerName: 'nursebot',
  containerTarget: '/usr/share/nginx/html',
  branch: 'main',
  distDir: 'dist'
};

const log = (msg: string, emoji = 'ℹ️') => console.log(`${emoji} ${msg}`);
const error = (msg: string) => {
  console.error(`\n❌ ERREUR CRITIQUE : ${msg}\n`);
  // Fix: Cast process to any to access exit() when standard Process types are restricted or incomplete
  (process as any).exit(1);
};

async function run() {
  console.log('\n🚀 --- NurseBot PRO : Déploiement Stable v2.5 --- 🚀\n');

  try {
    // Fix: Cast process to any to access cwd() when standard Process types are restricted or incomplete
    const rootDir = (process as any).cwd();
    const distPath = path.resolve(rootDir, CONFIG.distDir);

    // 1. Nettoyage Git & Pull
    log(`Synchronisation Git...`, '🌿');
    try {
      execSync(`git fetch origin && git reset --hard origin/${CONFIG.branch}`, { stdio: 'inherit' });
    } catch (e) {
      log('Git reset échoué, continuation...', '⚠️');
    }

    // 2. Build Vite
    log('Installation et Build...', '🏗️');
    execSync('npm install && npx vite build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      error("Le build a échoué : index.html absent du dossier dist.");
    }
    
    // 3. Gestion du déploiement Docker
    log(`Vérification du conteneur [${CONFIG.containerName}]...`, '🔍');
    
    let hostPath = '';
    try {
      const inspect = execSync(`docker inspect ${CONFIG.containerName} --format '{{ json .Mounts }}'`).toString();
      const mounts = JSON.parse(inspect);
      const htmlMount = mounts.find((m: any) => m.Destination === CONFIG.containerTarget);
      if (htmlMount) hostPath = htmlMount.Source;
    } catch (e) {
      log("Conteneur non détecté, tentative de démarrage via docker-cp...", '⚠️');
    }

    // LOGIQUE DE COPIE SÉCURISÉE
    if (hostPath) {
      const resolvedHost = path.resolve(hostPath);
      const resolvedDist = path.resolve(distPath);

      if (resolvedHost === resolvedDist) {
        log(`Dossiers identiques : Les fichiers sont déjà en place dans ${resolvedHost}`, '✨');
      } else {
        log(`Mise à jour du point de montage : ${resolvedHost}`, '🚀');
        execSync(`sudo rm -rf ${resolvedHost}/*`);
        execSync(`sudo cp -rf ${resolvedDist}/* ${resolvedHost}/`);
      }
      
      // Réparation des droits pour Nginx (UID 33 = www-data)
      execSync(`sudo chown -R 33:33 ${resolvedHost}`);
    } else {
      log(`Mode Secours : Transfert manuel vers le conteneur...`, '📤');
      execSync(`docker cp ${distPath}/. ${CONFIG.containerName}:${CONFIG.containerTarget}/`);
      execSync(`docker exec ${CONFIG.containerName} chown -R 33:33 ${CONFIG.containerTarget}`);
    }

    // 4. Reload Nginx
    try {
      execSync(`docker exec ${CONFIG.containerName} nginx -s reload`);
      log('Nginx rafraîchi avec succès.', '🔄');
    } catch (e) {}

    log('DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !', '✅');

  } catch (err: any) {
    error(err.message);
  }
}

run();
