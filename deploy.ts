
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NurseBot PRO - Script de Déploiement "Smart Docker" (Version 2.3)
 * Intègre une vérification pré-vol des variables d'environnement.
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
  process.exit(1);
};

async function run() {
  console.log('\n🚀 --- NurseBot PRO : Déploiement Intelligent v2.3 --- 🚀\n');

  try {
    // 0. Vérification du fichier .env (Indispensable pour Vite)
    log(`Vérification du fichier de configuration .env...`, '🔍');
    const envPath = path.resolve('.env');
    if (!fs.existsSync(envPath)) {
      error(`Le fichier .env est INTROUVABLE dans ${process.cwd()}. 
      Vite a besoin de ce fichier à la racine du projet pour injecter les clés Supabase.
      Si votre fichier est à la racine du VPS, déplacez-le ici : ${process.cwd()}/.env`);
    } else {
      const envContent = fs.readFileSync(envPath, 'utf8');
      if (!envContent.includes('VITE_SUPABASE_URL')) {
        error("Le fichier .env existe mais ne contient pas la variable VITE_SUPABASE_URL.");
      }
      log(`Fichier .env détecté et valide.`, '✅');
    }

    // 1. Mise à jour Git
    log(`Sync branche ${CONFIG.branch}...`, '🌿');
    try {
      execSync(`git fetch origin && git reset --hard origin/${CONFIG.branch}`, { stdio: 'inherit' });
    } catch (e) {
      log('Git reset ignoré ou échoué, utilisation des fichiers actuels.', '⚠️');
    }

    // 2. Installation des dépendances
    log('Installation des dépendances...', '📦');
    execSync('npm install', { stdio: 'inherit' });

    // 3. Build local avec injection
    log('Génération du build production (Vite)...', '🏗️');
    execSync('npx vite build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    const distPath = path.resolve(CONFIG.distDir);
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      error("Le build a échoué : index.html absent du dossier 'dist'.");
    }
    
    // 4. Déploiement vers Docker
    log(`Analyse du conteneur [${CONFIG.containerName}]...`, '🔍');
    let hostPath = '';
    try {
      const inspect = execSync(`docker inspect ${CONFIG.containerName} --format '{{ json .Mounts }}'`).toString();
      const mounts = JSON.parse(inspect);
      const htmlMount = mounts.find((m: any) => m.Destination === CONFIG.containerTarget);
      
      if (htmlMount && htmlMount.Source) {
        hostPath = htmlMount.Source;
      }
    } catch (e) {}

    if (hostPath) {
      log(`Copie des fichiers vers l'hôte [${hostPath}]...`, '🚀');
      execSync(`sudo rm -rf ${hostPath}/*`);
      execSync(`sudo cp -rf ${distPath}/* ${hostPath}/`);
      execSync(`sudo chown -R 33:33 ${hostPath}`); 
    } else {
      log(`Mode secours : Docker CP...`, '📤');
      execSync(`docker cp ${distPath}/. ${CONFIG.containerName}:${CONFIG.containerTarget}/`);
      execSync(`docker exec ${CONFIG.containerName} chown -R 33:33 ${CONFIG.containerTarget}`);
    }

    // 5. Rechargement Nginx
    try {
      execSync(`docker exec ${CONFIG.containerName} nginx -s reload`);
    } catch (e) {}

    log('DÉPLOIEMENT RÉUSSI !', '✅');
    console.log(`\n✨ NurseBot est synchronisé avec vos variables d'environnement.`);

  } catch (err: any) {
    error(err.message);
  }
}

run();
