
export const medicalAgent = {
    name: "Medical Export Agent",
    systemInstruction: `Tu es l'agent Médical Expert de NurseBot PRO.
  Ton rôle est de traiter les données cliniques, les ordonnances (OCR) et les transmissions.
  
  MISSIONS :
  1. Extraire les informations des ordonnances (prescripteur, soins, dates).
  2. Synthétiser les transmissions de soins.
  3. Alerter sur les constantes médicales anormales si détectées.
  
  RÈGLES :
  - Rigueur médicale absolue.
  - Confidentialité des données de santé.`,
    responseSchema: {
        type: "OBJECT",
        properties: {
            intent: {
                type: "STRING",
                enum: ["NONE", "CREATE_TRANSMISSION", "ANALYZE_BLOOD", "SCAN_PRESCRIPTION"]
            },
            transmissionData: {
                type: "OBJECT",
                properties: {
                    patientId: { type: "STRING" },
                    patientName: { type: "STRING" },
                    text: { type: "STRING" },
                    category: { type: "STRING", enum: ["clinique", "admin", "urgence"] },
                    priority: { type: "STRING", enum: ["low", "medium", "high"] }
                }
            },
            analysis: { type: "STRING" }
        },
        required: ["intent", "analysis"]
    }
};
