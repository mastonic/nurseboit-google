# 🩺 NurseBot - Assistant Intelligent pour Cabinet Infirmier (IDEL)

NurseBot est une plateforme logicielle avancée conçue pour réduire la charge administrative des infirmières libérales. Elle combine l'intelligence artificielle (Gemini), la gestion de planning et un module de pré-facturation NGAP.

## 🚀 Fonctionnalités Clés
- **Orchestrateur IA** : Routage intelligent des demandes (Infirmières vs Patients).
- **OCR Ordonnances** : Extraction automatique des soins et dates d'échéance.
- **Planning Dynamique** : Gestion des tournées pour 3 infirmières avec détection de conflits.
- **Pré-facturation IDEL** : Calculateur NGAP (AMI/AIS/BSI) avec gestion des majorations et déplacements.
- **Messagerie WhatsApp** : Interface de communication patient avec suggestions de réponses IA.

---

## 🛠 Pré-requis Système (VPS)

Pour une installation fluide sur un VPS (ex: OVH - Offre Starter ou Comfort), voici les besoins :

### 1. Configuration Serveur recommandée
- **OS** : Ubuntu 22.04 LTS (recommandé).
- **CPU/RAM** : 1 vCore / 2 Go RAM (NurseBot est léger car il s'appuie sur des APIs externes).
- **Stockage** : 10 Go SSD.
- **Nom de Domaine** : Un domaine (ex: `app.mon-cabinet.fr`) avec certificat SSL (HTTPS obligatoire pour la caméra/micro).

### 2. Dépendances Logicielles
- **Nginx** (Serveur Web).
- **Node.js 18+** & **NPM** (Pour le build).
- **Certbot** (Pour le SSL Let's Encrypt).

---

## 📦 Installation Pas à Pas (Déploiement OVH)

### Étape 1 : Préparation du VPS
Connectez-vous en SSH et mettez à jour le système :
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install nginx git -y
```

### Étape 2 : Installation de Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Étape 3 : Récupération et Build de l'App
```bash
cd /var/www
# Copiez les fichiers de l'application ici
# Si vous utilisez un bundler (Vite/Webpack) :
npm install
npm run build
```
*Note : Si vous utilisez la version ESM direct (index.html), assurez-vous que les chemins de fichiers sont corrects dans le dossier `/var/www/nursebot`.*

### Étape 4 : Configuration de l'API Key Gemini
L'application requiert une clé API Google AI Studio.
Dans votre environnement de déploiement (ou via votre outil de CI/CD), injectez :
`API_KEY=VOTRE_CLE_GEMINI_ICI`

### Étape 5 : Configuration Nginx
Créez un fichier de configuration : `sudo nano /etc/nginx/sites-available/nursebot`
```nginx
server {
    listen 80;
    server_name app.votre-domaine.fr;
    root /var/www/nursebot;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Sécurité supplémentaire pour les données de santé (simulation)
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
}
```
Activez le site :
```bash
sudo ln -s /etc/nginx/sites-available/nursebot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Étape 6 : Sécurisation HTTPS (Crucial pour IDEL)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d app.votre-domaine.fr
```

---

## 🔑 Configuration des Services Externes

Une fois l'app en ligne, accédez à l'onglet **Paramètres > Intégrations** :
1. **Twilio** : Renseignez le SID et Token pour activer les notifications WhatsApp réelles.
2. **Gemini** : La clé est déjà injectée au build, mais vérifiez la connexion dans l'interface.
3. **MCP** : Ajoutez les serveurs de base médicale (ex: Vidal) si disponibles.

---

## 🔒 Sécurité & Conformité
- **Identification** : L'accès est protégé par un Code PIN unique par infirmière.
- **Local Storage** : Les données sont persistées localement dans le navigateur. Pour une mise en production multi-appareils, connectez la base de données **Supabase** via le fichier `services/store.ts`.
- **HDS** : Pour un usage réel en France avec des données patient sensibles, assurez-vous de migrer le stockage vers un hébergeur certifié HDS (Hébergeur de Données de Santé).

---

## 📞 Support
Pour toute question technique : `dev-support@nursebot.ai`
Version : 1.0.0-beta
Architecture par : Senior Product Architect Agent
