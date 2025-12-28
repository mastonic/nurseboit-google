import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - Script de Déploiement VPS (Compatible Traefik)
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
  console.log('\n🚀 --- NurseBot PRO : Déploiement pour Traefik --- 🚀\n');

  try {
    // 1. Mise à jour via Git
    log(`Mise à jour du code source depuis ${CONFIG.branch}...`, '🌿');
    try {
      execSync('git fetch origin', { stdio: 'inherit' });
      execSync(`git reset --hard origin/${CONFIG.branch}`, { stdio: 'inherit' });
    } catch (e) {
      log('Git update impossible, utilisation des fichiers locaux...', '⚠️');
    }

    // 2. Installation des dépendances
    log('Installation des dépendances...', '📦');
    execSync('npm install', { stdio: 'inherit' });

    // 3. Build de l'application
    log('Build de l\'application statique...', '🏗️');
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    execSync('npm run build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    const distPath = path.resolve('dist');
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      error("Build invalide : index.html absent.");
    }

    // 4. Sauvegarde (Backup)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = `${CONFIG.backupPrefix}${timestamp}`;

    if (fs.existsSync(CONFIG.webRoot)) {
      log(`Backup de l'ancienne version...`, '🗂️');
      execSync(`sudo cp -r ${CONFIG.webRoot} ${backupPath}`);
      execSync(`sudo rm -rf ${CONFIG.webRoot}/*`);
    } else {
      execSync(`sudo mkdir -p ${CONFIG.webRoot}`);
    }

    // 5. Déploiement
    log(`Déploiement des fichiers vers ${CONFIG.webRoot}...`, '🚚');
    execSync(`sudo cp -r ${distPath}/* ${CONFIG.webRoot}/`);

    // 6. Fix Permissions Universel (Crucial pour éviter la 403)
    log(`Application des permissions universelles (chmod 755)...`, '🔐');
    // On rend les dossiers traversables et les fichiers lisibles par tous les services (Traefik/Docker/etc)
    execSync(`sudo chmod -R 755 ${CONFIG.webRoot}`);

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

    log('DÉPLOIEMENT TERMINÉ !', '✅');
    console.log(`\n🌐 L'application est prête à être servie par Traefik.\n`);

  } catch (err: any) {
    error(err.message);
  }
}

run();