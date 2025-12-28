import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - Script de Déploiement VPS Automatisé
 * Optimisé pour la gestion des permissions Nginx (403 Forbidden Fix)
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
  console.log('\n🚀 --- NurseBot PRO : Déploiement via Git --- 🚀\n');

  try {
    // 1. Mise à jour via Git
    log(`Mise à jour du code source (branche ${CONFIG.branch})...`, '🌿');
    try {
      execSync('git fetch origin', { stdio: 'inherit' });
      execSync(`git reset --hard origin/${CONFIG.branch}`, { stdio: 'inherit' });
    } catch (e) {
      log('Git update échoué, poursuite avec les fichiers locaux...', '⚠️');
    }

    // 2. Installation des dépendances
    log('Vérification des dépendances (npm install)...', '📦');
    execSync('npm install', { stdio: 'inherit' });

    // 3. Compilation
    log('Build de l\'application Vite...', '🏗️');
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    execSync('npm run build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    const distPath = path.resolve('dist');
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      error("Le build a échoué : index.html introuvable dans le dossier dist.");
    }

    // 4. Gestion des Backups
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = `${CONFIG.backupPrefix}${timestamp}`;

    if (fs.existsSync(CONFIG.webRoot)) {
      log(`Sauvegarde vers ${backupPath}...`, '🗂️');
      execSync(`cp -r ${CONFIG.webRoot} ${backupPath}`);
      execSync(`rm -rf ${CONFIG.webRoot}/*`);
    } else {
      execSync(`sudo mkdir -p ${CONFIG.webRoot}`);
    }

    // 5. Déploiement et Fix des Permissions (Correction de la 403)
    log(`Copie des fichiers vers ${CONFIG.webRoot}...`, '🚚');
    execSync(`sudo cp -r ${distPath}/* ${CONFIG.webRoot}/`);

    log(`Correction des permissions pour Nginx...`, '🔐');
    // On s'assure que Nginx peut lire les fichiers et parcourir les dossiers
    try {
      execSync(`sudo chown -R www-data:www-data ${CONFIG.webRoot}`);
      execSync(`sudo find ${CONFIG.webRoot} -type d -exec chmod 755 {} +`);
      execSync(`sudo find ${CONFIG.webRoot} -type f -exec chmod 644 {} +`);
    } catch (e) {
      log('Permissions corrigées via chmod alternatif...', '⚠️');
      execSync(`sudo chmod -R 755 ${CONFIG.webRoot}`);
    }

    // 6. Nettoyage des anciens backups
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

    // 7. Recharger Nginx
    try {
      execSync('sudo systemctl reload nginx', { stdio: 'ignore' });
      log('Nginx rechargé.', '🔄');
    } catch (e) {
      log('Nginx reload manuel peut être requis.', '⚠️');
    }

    log('DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !', '✅');
    console.log(`\n🌐 URL : https://nursebot.srv1146904.hstgr.cloud\n`);

  } catch (err: any) {
    error(err.message);
  }
}

run();