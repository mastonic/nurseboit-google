
import { execSync } from 'child_process';

/**
 * NurseBot PRO - Deploy (Update only)
 */

const APP_PATH = '/opt/nursebot/app';

console.log("🚀 Mise à jour de NurseBot...");

try {
  process.chdir(APP_PATH);
  
  console.log("📦 Build...");
  execSync("npm run build", { stdio: 'inherit' });

  console.log("🚢 Redémarrage Docker...");
  execSync("docker restart nursebot-app", { stdio: 'inherit' });

  console.log("✅ Terminé !");
} catch (err: any) {
  console.error("❌ Erreur :", err.message);
}
