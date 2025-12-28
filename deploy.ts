import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - Script de Déploiement VPS Automatisé
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
    log(`Récupération des dernières modifications sur la branche ${CONFIG.branch}...`, '🌿');
    try {
      execSync('git fetch origin', { stdio: 'inherit' });
      // Force la mise à jour locale par rapport au dépôt distant
      execSync(`git reset --hard origin/${CONFIG.branch}`, { stdio: 'inherit' });
    } catch (e) {
      log('Git update échoué. Vérifiez vos identifiants ou la connexion.', '⚠️');
    }

    // 2. Installation des dépendances (Nécessaire si package.json a changé)
    log('Installation/Mise à jour des dépendances (npm install)...', '📦');
    execSync('npm install', { stdio: 'inherit' });

    // 3. Nettoyage et Compilation
    log('Nettoyage du dossier dist et Build Vite...', '🏗️');
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }

    // Compilation forcée en mode production
    execSync('npm run build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    const distPath = path.resolve('dist');
    if (!fs.existsSync(distPath)) error("Le build a échoué : le dossier 'dist' n'existe pas.");

    // 4. Gestion des Backups
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = `${CONFIG.backupPrefix}${timestamp}`;

    if (fs.existsSync(CONFIG.webRoot)) {
      log(`Sauvegarde de la version actuelle vers ${backupPath}...`, '🗂️');
      execSync(`cp -r ${CONFIG.webRoot} ${backupPath}`);
      execSync(`rm -rf ${CONFIG.webRoot}/*`);
    } else {
      fs.mkdirSync(CONFIG.webRoot, { recursive: true });
    }

    // 5. Déploiement vers le dossier public Nginx
    log(`Déploiement des fichiers vers ${CONFIG.webRoot}...`, '🚚');
    execSync(`cp -r ${distPath}/* ${CONFIG.webRoot}/`);

    // 6. Nettoyage des anciens backups (garde seulement les 3 derniers)
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

    // 7. Recharger Nginx pour appliquer les changements
    try {
      execSync('sudo nginx -s reload', { stdio: 'ignore' });
      log('Serveur Nginx rechargé avec succès.', '🔄');
    } catch (e) {
      log('Note : Nginx n\'a pas pu être rechargé automatiquement (pas de sudo ?).', '⚠️');
    }

    log('DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !', '✅');
    console.log(`\n🌐 Application en ligne : https://nursebot.srv1146904.hstgr.cloud\n`);

  } catch (err: any) {
    error(err.message);
  }
}

run();