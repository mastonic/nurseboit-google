
import { GoogleGenAI, Type } from "@google/genai";
import { AgentType, Role } from "../types";

// Updated initialization to strictly match coding guidelines for process.env.API_KEY usage
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
Tu es NurseBot, l'assistante intelligente d'un cabinet infirmier de 3 personnes en France.
Tu agis comme un ORCHESTRATEUR. 

RÈGLES D'OR :
1. Identifie toujours le rôle de l'utilisateur (Infirmière ou Patient).
2. Route les demandes vers les agents spécialisés :
   - "RDV / planning / disponibilité / annulation / récurrence" -> Agent Planning
   - "ordonnance / scan / expiration / renouvellement / prescription" -> Agent Ordonnance
   - "facture / NGAP / AMI-AIS-BSI / déplacement / majoration / rejet / paiement" -> Agent Facturation
3. Demande TOUJOURS une confirmation humaine avant une action sensible (création, modification, suppression).
4. Pour les patients, sois poli, concis et limite les informations médicales partagées.
5. Pour les infirmières, sois efficace et technique (utilise le vocabulaire NGAP si besoin).

IMPORTANT: Si l'utilisateur demande une pré-facture, utilise le catalogue NGAP (AMI, AIS, BSI).
Rappelle systématiquement que tu n'es pas un outil de télétransmission agréé.
`;

export const processUserMessage = async (message: string, role: Role, context: any) => {
  // Using gemini-3-flash-preview for basic text processing tasks
  const model = 'gemini-3-flash-preview';
  
  const response = await ai.models.generateContent({
    model,
    // Fix: Updated comparison to handle multiple cabinet roles as 'Infirmière' and 'patient' separately
    contents: `Utilisateur (${role !== 'patient' ? 'Infirmière' : 'Patient'}): ${message}\nContext: ${JSON.stringify(context)}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING, description: "La réponse textuelle de NurseBot" },
          intent: { type: Type.STRING, enum: Object.values(AgentType), description: "L'agent cible identifié" },
          actionRequired: { type: Type.BOOLEAN, description: "Si une validation humaine est nécessaire" },
          actionType: { type: Type.STRING, description: "Type d'action (create_apt, validate_invoice, etc.)" },
          structuredData: { 
            type: Type.OBJECT, 
            description: "Données extraites si applicable",
            properties: {
              patientName: { type: Type.STRING },
              appointmentDate: { type: Type.STRING },
              appointmentTime: { type: Type.STRING },
              ngapCodes: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        },
        required: ["reply", "intent", "actionRequired"]
      }
    }
  });

  // response.text is a property, not a method
  return JSON.parse(response.text || '{}');
};

export const transcribeMeeting = async (audioData: string) => {
  // Using gemini-3-pro-preview for complex reasoning and summarization tasks
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Génère un compte rendu de réunion structuré à partir de ces notes ou audio transcript : ${audioData}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                owner: { type: Type.STRING },
                deadline: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });
  // response.text is a property, not a method
  return JSON.parse(response.text || '{}');
};
