
export const metadata = {
  "name": "NurseBot PRO",
  "description": "Assistant intelligent pour cabinets IDEL. Orchestration via VPS n8n. Gestion multi-agendas (Alice, Bertrand, Carine) et dossiers Drive automatiques.",
  "requestFramePermissions": [
    "camera",
    "microphone"
  ],
  "version": "2.2.0",
  "author": "Senior Product Architect",
  "deployment": {
    "platform": "VPS",
    "server": "Nginx",
    "runtime": "Node.js 20+",
    "ssl": "Certbot / Let's Encrypt"
  }
};
export default metadata;
