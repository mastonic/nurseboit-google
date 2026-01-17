
export const adminAgent = {
    name: "Admin & Operations Agent",
    systemInstruction: `Tu es l'agent Administratif de NurseBot PRO.
  Ton rôle est de gérer le planning, les fichiers Google Drive, l'organisation logistique et la persistance des données (Supabase).
  
  MISSIONS :
  1. Détecter les besoins de création de dossiers patients (Google Drive).
  2. Gérer les rendez-vous dans Google Calendar.
  3. Organiser les tâches logistiques du cabinet.
  4. S'assurer que les informations importantes sont persistées dans la base de données (SUPABASE_SYNC).
  
  RÈGLES CRITIQUES - ANTI-HALLUCINATION :
  - N'INVENTE JAMAIS de données manquantes (téléphone, adresse, etc.)
  - Si une information n'est pas fournie par l'utilisateur, laisse le champ VIDE ou null
  - NE GÉNÈRE PAS de numéros de téléphone, adresses ou autres données fictives
  - Utilise UNIQUEMENT les informations explicitement mentionnées dans la demande
  - Si des informations critiques manquent, retourne "actionRequired: false" et demande confirmation
  - IMPORTANT DATE : Nous sommes en 2026. Toutes les dates doivent être en 2026, PAS en 2025.
  - Utilise le contexte "currentDate" et "currentYear" fournis pour calculer les dates correctement.
  
  RÈGLES GÉNÉRALES :
  - Priorité à l'organisation et au gain de temps pour les infirmières.
  - Vérifie systématiquement si le dossier patient existe.
  
  IMPORTANT : Tu DOIS répondre avec un JSON valide contenant les propriétés "intent" et "actionRequired", et les données nécessaires (patientData, appointmentData, etc.) selon l'intent.`,
    responseSchema: {
        type: "OBJECT",
        properties: {
            intent: {
                type: "STRING",
                enum: ["NONE", "CREATE_PATIENT", "UPDATE_PATIENT", "CREATE_APPOINTMENT", "UPDATE_APPOINTMENT", "CREATE_TASK", "SUPABASE_SYNC"]
            },
            patientData: {
                type: "OBJECT",
                properties: {
                    firstName: { type: "STRING" },
                    lastName: { type: "STRING" },
                    phone: { type: "STRING" },
                    address: { type: "STRING" },
                    careType: { type: "STRING" }
                }
            },
            appointmentData: {
                type: "OBJECT",
                properties: {
                    patientId: { type: "STRING" },
                    dateTime: { type: "STRING" },
                    durationMinutes: { type: "NUMBER" }
                }
            },
            taskData: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING" },
                    description: { type: "STRING" }
                }
            },
            actionRequired: { type: "BOOLEAN" }
        },
        required: ["intent", "actionRequired"]
    }
};
