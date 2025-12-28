
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - Script de Déploiement VPS (Amélioré pour Forcer la Mise à Jour)
 */

const CONFIG = {
  webRoot: '/var/www/nursebot',
  backupPrefix: '/var/www/nursebot_backup_',
  maxBackups: 3,
  branch: 'main'
};

const log = (msg: string, emoji = 'ℹ️') => console.log(`${emoji} ${msg}`);
const error = (msg: string) => {
  console.error(`❌ ERREUR : ${msg}`);
  process.exit(1);
};

async function run() {
  console.log('\n🚀 --- NurseBot PRO : Déploiement Force --- 🚀\n');

  try {
    // 1. Mise à jour via Git
    log(`Mise à jour du code source depuis ${CONFIG.branch}...`, '🌿');
    try {
      execSync('git fetch origin', { stdio: 'inherit' });
      execSync(`git reset --hard origin/${CONFIG.branch}`, { stdio: 'inherit' });
    } catch (e) {
      log('Git update impossible ou dossier non Git, utilisation des fichiers locaux...', '⚠️');
    }

    // 2. Nettoyage & Installation
    log('Installation des dépendances...', '📦');
    // On peut ajouter --force pour garantir une installation propre si nécessaire
    execSync('npm install', { stdio: 'inherit' });

    // 3. Build de l'application
    log('Build de l\'application statique (Vite)...', '🏗️');
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    
    // IMPORTANT: Injecte les variables d'env du shell actuel dans le build Vite
    execSync('npm run build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    const distPath = path.resolve('dist');
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      error("Build invalide : index.html absent dans /dist.");
    }

    // 4. Sauvegarde (Backup)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = `${CONFIG.backupPrefix}${timestamp}`;

    if (fs.existsSync(CONFIG.webRoot)) {
      log(`Backup de l'ancienne version...`, '🗂️');
      execSync(`sudo cp -r ${CONFIG.webRoot} ${backupPath}`);
      log(`Nettoyage du dossier de destination...`, '🧹');
      execSync(`sudo rm -rf ${CONFIG.webRoot}/*`);
    } else {
      execSync(`sudo mkdir -p ${CONFIG.webRoot}`);
    }

    // 5. Déploiement
    log(`Déploiement des nouveaux fichiers vers ${CONFIG.webRoot}...`, '🚚');
    // On utilise -T pour éviter les problèmes de dossiers imbriqués et on force
    execSync(`sudo cp -rf ${distPath}/* ${CONFIG.webRoot}/`);

    // 6. Fix Permissions
    log(`Application des permissions universelles...`, '🔐');
    execSync(`sudo chmod -R 755 ${CONFIG.webRoot}`);
    execSync(`sudo chown -R www-data:www-data ${CONFIG.webRoot}`);

    // 7. Nettoyage des vieux backups
    const parentDir = path.dirname(CONFIG.webRoot);
    const backups = fs.readdirSync(parentDir)
      .filter(f => f.startsWith('nursebot_backup_'))
      .map(f => ({ name: f, time: fs.statSync(path.join(parentDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (backups.length > CONFIG.maxBackups) {
      backups.slice(CONFIG.maxBackups).forEach(b => {
        execSync(`sudo rm -rf ${path.join(parentDir, b.name)}`);
      });
    }

    log('DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !', '✅');
    log(`Date du build : ${new Date().toLocaleString('fr-FR')}`, '📅');
    console.log(`\n🌐 Si les changements ne sont pas visibles, faites CTRL+F5 sur votre navigateur.\n`);

  } catch (err: any) {
    error(err.message);
  }
}

run();
