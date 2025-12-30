
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - Script de Déploiement "Robust" (Version 2.7)
 * Correction spécifique pour l'erreur ERR_MODULE_NOT_FOUND (Vite).
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
  (process as any).exit(1);
};

async function run() {
  console.log('\n🚀 --- NurseBot PRO : Déploiement Stable v2.7 --- 🚀\n');

  try {
    const rootDir = (process as any).cwd();
    const distPath = path.resolve(rootDir, CONFIG.distDir);

    log(`Répertoire de travail : ${rootDir}`, '📂');

    // 1. Synchronisation Git
    log(`Synchronisation Git...`, '🌿');
    try {
      execSync(`git fetch origin ${CONFIG.branch}`, { stdio: 'inherit' });
      log('Fetch terminé.', '✅');
    } catch (e) {
      log('Git fetch échoué ou ignoré.', '⚠️');
    }

    // 2. Installation des dépendances
    log('Réparation des dépendances (npm install)...', '📦');
    try {
      // On force npm install pour être sûr que 'vite' est bien lié dans node_modules
      execSync('npm install', { stdio: 'inherit' });
    } catch (e: any) {
      log('Erreur npm install, tentative de nettoyage...', '⚠️');
      execSync('rm -rf node_modules package-lock.json && npm install', { stdio: 'inherit' });
    }

    // 3. Build Production
    log('Exécution du build (npm run build)...', '⚡');
    try {
      // npm run build est plus stable que npx car il initialise mieux le PATH
      execSync('npm run build', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
    } catch (e: any) {
      log('Le build via npm a échoué, tentative via npx direct...', '⚠️');
      execSync('npx vite build', { stdio: 'inherit' });
    }

    // Vérification finale du build
    if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
      error("Le dossier 'dist' est vide ou incomplet après le build.");
    }
    
    // 4. Synchronisation avec Docker
    log(`Analyse du conteneur [${CONFIG.containerName}]...`, '🔍');
    let hostPath = '';
    try {
      const inspect = execSync(`docker inspect ${CONFIG.containerName} --format '{{ json .Mounts }}'`).toString();
      const mounts = JSON.parse(inspect);
      const htmlMount = mounts.find((m: any) => m.Destination === CONFIG.containerTarget);
      if (htmlMount) hostPath = htmlMount.Source;
    } catch (e) {
      log("Conteneur non trouvé.", '⚠️');
    }

    if (hostPath) {
      const resolvedHost = path.resolve(hostPath);
      const resolvedDist = path.resolve(distPath);

      if (resolvedHost === resolvedDist) {
        log(`Volume Direct : Le build est déjà prêt dans ${resolvedHost}`, '✨');
      } else {
        log(`Mise à jour du volume hôte : ${resolvedHost}`, '🚀');
        execSync(`sudo rm -rf ${resolvedHost}/*`);
        execSync(`sudo cp -rp ${resolvedDist}/. ${resolvedHost}/`);
      }
      
      log('Permissions Nginx (www-data)...', '🔐');
      execSync(`sudo chown -R 33:33 ${resolvedHost}`);
      execSync(`sudo chmod -R 755 ${resolvedHost}`);
    } else {
      log(`Mode Fallback : Docker CP...`, '📤');
      execSync(`docker cp ${distPath}/. ${CONFIG.containerName}:${CONFIG.containerTarget}/`);
      execSync(`docker exec ${CONFIG.containerName} chown -R 33:33 ${CONFIG.containerTarget}`);
    }

    // 5. Reload
    try {
      execSync(`docker exec ${CONFIG.containerName} nginx -s reload`);
      log('Nginx rafraîchi.', '🔄');
    } catch (e) {}

    log('DÉPLOIEMENT RÉUSSI !', '✅');

  } catch (err: any) {
    error(err.message);
  }
}

run();
