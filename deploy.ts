import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - Script de Déploiement VPS
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
  console.log('\n🚀 --- NurseBot PRO : Déploiement en cours --- 🚀\n');

  try {
    // 1. Git Update (Désactivé pour préserver les modifications locales de l'IA)
    log(`Utilisation des fichiers locaux modifiés...`, '🌿');
    /*
    try {
      execSync('git fetch origin', { stdio: 'inherit' });
      execSync(`git reset --hard origin/${CONFIG.branch}`, { stdio: 'inherit' });
    } catch (e) {
      log('Git reset échoué, utilisation des fichiers actuels.', '⚠️');
    }
    */

    // 2. Dependencies
    log('Installation des dépendances...', '📦');
    execSync('npm install', { stdio: 'inherit' });

    // 3. Clean Build
    log('Nettoyage et Compilation...', '🏗️');
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }

    // On lance le build de Vite
    execSync('npm run build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    const distPath = path.resolve('dist');
    const assetsPath = path.join(distPath, 'assets');
    
    // Vérification cruciale : Vite doit avoir généré au moins un fichier JS
    if (!fs.existsSync(distPath)) error("Le dossier 'dist' n'a pas été créé.");
    
    const distFiles = fs.readdirSync(distPath);
    const hasAssets = fs.existsSync(assetsPath) && fs.readdirSync(assetsPath).length > 0;
    
    if (!hasAssets) {
      error("Le build a réussi mais aucun fichier JS n'a été généré dans 'dist/assets'. Vérifiez vos imports dans index.tsx.");
    }

    // 4. Backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = `${CONFIG.backupPrefix}${timestamp}`;

    if (fs.existsSync(CONFIG.webRoot)) {
      log(`Backup de l'ancienne version...`, '🗂️');
      execSync(`cp -r ${CONFIG.webRoot} ${backupPath}`);
      execSync(`rm -rf ${CONFIG.webRoot}/*`);
    } else {
      fs.mkdirSync(CONFIG.webRoot, { recursive: true });
    }

    // 5. Deploy
    log(`Publication vers ${CONFIG.webRoot}...`, '🚚');
    execSync(`cp -r ${distPath}/* ${CONFIG.webRoot}/`);

    // 6. Cleanup
    const parentDir = path.dirname(CONFIG.webRoot);
    const backups = fs.readdirSync(parentDir)
      .filter(f => f.startsWith('nursebot_backup_'))
      .map(f => ({ name: f, time: fs.statSync(path.join(parentDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (backups.length > CONFIG.maxBackups) {
      backups.slice(CONFIG.maxBackups).forEach(b => {
        fs.rmSync(path.join(parentDir, b.name), { recursive: true, force: true });
      });
    }

    // 7. Nginx
    try {
      execSync('sudo nginx -s reload', { stdio: 'ignore' });
      log('Nginx rechargé.', '🔄');
    } catch (e) {}

    log('DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !', '✅');
    console.log(`\n🌐 https://nursebot.srv1146904.hstgr.cloud\n`);

  } catch (err: any) {
    error(err.message);
  }
}

run();