
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - Script de Déploiement "Smart Docker" (Version 2.2)
 * Résout l'erreur "Read-only file system" et "Vite not found".
 */

const CONFIG = {
  containerName: 'nursebot',
  containerTarget: '/usr/share/nginx/html',
  branch: 'main',
  distDir: 'dist'
};

const log = (msg: string, emoji = 'ℹ️') => console.log(`${emoji} ${msg}`);
const error = (msg: string) => {
  console.error(`❌ ERREUR : ${msg}`);
  process.exit(1);
};

async function run() {
  console.log('\n🚀 --- NurseBot PRO : Déploiement Intelligent v2.2 --- 🚀\n');

  try {
    // 1. Mise à jour Git
    log(`Sync branche ${CONFIG.branch}...`, '🌿');
    try {
      execSync(`git fetch origin && git reset --hard origin/${CONFIG.branch}`, { stdio: 'inherit' });
    } catch (e) {
      log('Git reset ignoré, utilisation des fichiers locaux.', '⚠️');
    }

    // 2. Installation des dépendances
    // IMPORTANT : On ne définit PAS NODE_ENV=production ici, sinon npm ignore Vite (devDep)
    log('Installation des dépendances (incluant devDeps pour le build)...', '📦');
    execSync('npm install', { stdio: 'inherit' });

    // Vérification de sécurité pour Vite
    if (!fs.existsSync('./node_modules/.bin/vite')) {
      log('Vite non trouvé dans node_modules, tentative d\'installation forcée...', '⚠️');
      execSync('npm install vite @vitejs/plugin-react --save-dev', { stdio: 'inherit' });
    }

    // 3. Build local
    log('Génération du build production (Vite)...', '🏗️');
    // On utilise npx pour être certain de trouver le binaire localement
    execSync('npx vite build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    const distPath = path.resolve(CONFIG.distDir);
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      error("Le build a échoué : index.html absent du dossier 'dist'.");
    }
    
    // 4. Identification du point de montage (Host Path)
    log(`Analyse du conteneur [${CONFIG.containerName}]...`, '🔍');
    let hostPath = '';
    try {
      const inspect = execSync(`docker inspect ${CONFIG.containerName} --format '{{ json .Mounts }}'`).toString();
      const mounts = JSON.parse(inspect);
      const htmlMount = mounts.find((m: any) => m.Destination === CONFIG.containerTarget);
      
      if (htmlMount && htmlMount.Source) {
        hostPath = htmlMount.Source;
        log(`Point de montage trouvé sur l'hôte : ${hostPath}`, '📂');
      }
    } catch (e) {
      log('Détection auto du volume impossible via Docker Inspect.', '⚠️');
    }

    // 5. Déploiement
    if (hostPath) {
      log(`Copie des fichiers vers l'hôte [${hostPath}]...`, '🚀');
      // On utilise sudo car les volumes Docker appartiennent souvent à root
      execSync(`sudo rm -rf ${hostPath}/*`);
      execSync(`sudo cp -rf ${distPath}/* ${hostPath}/`);
      log(`Permissions : chown 33:33 (www-data)...`, '🔐');
      execSync(`sudo chown -R 33:33 ${hostPath}`); 
    } else {
      log(`Tentative de copie directe via Docker CP (Mode secours)...`, '📤');
      try {
        execSync(`docker cp ${distPath}/. ${CONFIG.containerName}:${CONFIG.containerTarget}/`);
        execSync(`docker exec ${CONFIG.containerName} chown -R 33:33 ${CONFIG.containerTarget}`);
      } catch (e: any) {
        error(`Système de fichiers en lecture seule détecté et aucun volume trouvé. Impossible de déployer.`);
      }
    }

    // 6. Rechargement Nginx
    log('Rechargement Nginx dans le conteneur...', '🔄');
    try {
      execSync(`docker exec ${CONFIG.containerName} nginx -s reload`);
    } catch (e) {
      log('Nginx reload non supporté par ce conteneur.', '⚠️');
    }

    log('DÉPLOIEMENT RÉUSSI !', '✅');
    console.log(`\n✨ NurseBot est maintenant à jour.`);

  } catch (err: any) {
    error(err.message);
  }
}

run();
