
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - Script de Déploiement Docker (Optimisé pour srv1146904)
 */

const CONFIG = {
  containerName: 'nursebot',
  containerPath: '/usr/share/nginx/html',
  branch: 'main',
  distDir: 'dist'
};

const log = (msg: string, emoji = 'ℹ️') => console.log(`${emoji} ${msg}`);
const error = (msg: string) => {
  console.error(`❌ ERREUR : ${msg}`);
  process.exit(1);
};

async function run() {
  console.log('\n🚀 --- NurseBot PRO : Déploiement Docker Force --- 🚀\n');

  try {
    // 1. Mise à jour via Git
    log(`Récupération de la branche ${CONFIG.branch}...`, '🌿');
    try {
      execSync('git fetch origin', { stdio: 'inherit' });
      execSync(`git reset --hard origin/${CONFIG.branch}`, { stdio: 'inherit' });
    } catch (e) {
      log('Attention : Git reset impossible, continuation avec les fichiers locaux...', '⚠️');
    }

    // 2. Nettoyage et Installation
    log('Nettoyage du cache et installation des dépendances...', '📦');
    execSync('npm install', { stdio: 'inherit' });

    // 3. Build de l'application
    log('Génération du build production (Vite)...', '🏗️');
    if (fs.existsSync(CONFIG.distDir)) {
      fs.rmSync(CONFIG.distDir, { recursive: true, force: true });
    }
    
    // Injection des variables d'environnement lors du build
    execSync('npm run build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    const distPath = path.resolve(CONFIG.distDir);
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      error("Le build a échoué : index.html est introuvable dans /dist.");
    }

    // 4. Déploiement vers le conteneur Docker
    log(`Déploiement vers le conteneur [${CONFIG.containerName}]...`, '🚚');
    
    // Vérifier si le conteneur est lancé
    try {
      execSync(`docker ps -f name=${CONFIG.containerName} --format "{{.Names}}"`);
    } catch (e) {
      error(`Le conteneur '${CONFIG.containerName}' ne semble pas être en cours d'exécution.`);
    }

    // Vider le dossier de destination dans le conteneur pour éviter les résidus de vieux builds
    log(`Nettoyage du dossier cible dans le conteneur...`, '🧹');
    execSync(`docker exec ${CONFIG.containerName} sh -c "rm -rf ${CONFIG.containerPath}/*"`);

    // Copier les fichiers du dossier dist vers le conteneur
    log(`Copie des fichiers via docker cp...`, '📤');
    execSync(`docker cp ${distPath}/. ${CONFIG.containerName}:${CONFIG.containerPath}/`);

    // 5. Ajustement des permissions à l'intérieur du conteneur (www-data:www-data / UID 33)
    log(`Correction des permissions (chown 33:33)...`, '🔐');
    execSync(`docker exec ${CONFIG.containerName} chown -R 33:33 ${CONFIG.containerPath}`);

    log('DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !', '✅');
    log(`Build injecté dans ${CONFIG.containerName}:${CONFIG.containerPath}`, '📍');
    log(`Date du build : ${new Date().toLocaleString('fr-FR')}`, '📅');
    
    console.log(`\n🌐 Si les changements ne sont pas visibles, effectuez un CTRL+F5.`);

  } catch (err: any) {
    error(err.message);
  }
}

run();
