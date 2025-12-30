
import { Role } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Interface de communication avec Gemini API pour NurseBot PRO.
 * Orchestration DYNAMIQUE basée sur la liste réelle du staff.
 */

export const processUserMessage = async (message: string, role: Role, context: any) => {
  // Extraction des noms du staff pour l'IA
  const staffNames = context.cabinetStaff ? context.cabinetStaff.map((u: any) => u.firstName).join(', ') : "Alice, Bertrand, Carine";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: message,
      config: {
        systemInstruction: `Tu es NurseBot PRO, l'IA orchestratrice du cabinet.
        
        STAFF ACTUEL : ${staffNames}.
        
        RÈGLES D'IDENTIFICATION :
        - Identifie l'infirmière concernée parmi la liste ci-dessus.
        - Si un nouveau membre est mentionné mais absent de la liste, suggère de le créer dans l'onglet 'Staff'.
        
        LOGIQUE DRIVE : 
        Si context.patient.googleDriveFolderId est manquant, ton intention PRIORITAIRE est 'DRIVE_CREATE_FOLDER'.
        
        LOGIQUE RÉPONSE :
        Adapte le ton : Vocal (Twilio) = Très court / Texte (WhatsApp) = Détaillé.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            intent: { type: Type.STRING, description: "CHAT|PLANNING|DRIVE_CREATE_FOLDER|SUPABASE_SYNC" },
            targetNurse: { type: Type.STRING, description: "Nom de l'infirmière identifiée dans la liste" },
            actionRequired: { type: Type.BOOLEAN }
          },
          required: ['reply', 'intent', 'actionRequired']
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini processUserMessage error:", error);
    return { 
      reply: "L'orchestrateur rencontre une difficulté de synchronisation.", 
      intent: "CHAT", 
      actionRequired: false 
    };
  }
};

export const transcribeVoiceNote = async (base64Audio: string, mimeType: string = "audio/webm") => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType } },
          { text: "Transcris cette transmission. Sois précis sur les constantes médicales." }
        ]
      }
    });
    return { transcription: response.text };
  } catch (error) {
    return { transcription: "[Erreur de transcription]" };
  }
};

export const analyzePrescriptionOCR = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/png' } },
          { text: "Extrais les données de l'ordonnance." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prescriber: { type: Type.STRING },
            datePrescribed: { type: Type.STRING },
            careDetails: { type: Type.STRING },
            patientName: { type: Type.STRING }
          },
          required: ['prescriber', 'careDetails']
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return {};
  }
};

export const transcribeMeeting = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Synthétise cette réunion : ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
    return JSON.parse(response.text || '{"decisions":[], "tasks":[]}');
  } catch (error) {
    return { decisions: [], tasks: [] };
  }
};
