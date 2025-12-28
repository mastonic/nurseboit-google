import { Role } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Interface de communication avec Gemini API.
 */

export const processUserMessage = async (message: string, role: Role, context: any) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: message,
      config: {
        systemInstruction: `Tu es NurseBot PRO, l'assistant expert pour un cabinet d'infirmiers libéraux (IDEL). 
        Rôle de l'utilisateur actuel: ${role}. 
        Contexte patient/planning: ${JSON.stringify(context)}.
        
        TES MISSIONS:
        1. TRANSMISSION: Aide à rédiger des transmissions ciblées (Observations, Vigilance, Actions).
        2. PLANNING: Aide à organiser les tournées et détecter les conflits.
        3. FACTURATION: Aide sur la nomenclature NGAP (AMI, AIS, BSI) et les majorations.
        4. CLINIQUE: Fournit des rappels de protocoles basés sur les bonnes pratiques.

        CONSIGNES:
        - Réponds de manière très concise, professionnelle et empathique.
        - Utilise le jargon IDEL approprié (DSI, BSI, tournées, cotations).
        - Retourne uniquement un JSON structuré avec 'reply' (ton texte), 'intent' (CHAT|TRANSMISSION|PLANNING|BILLING) et 'actionRequired' (boolean).`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            intent: { type: Type.STRING },
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
      reply: "[Service IA] Une erreur est survenue lors de la communication avec l'assistant.", 
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
          { text: "Transcris fidèlement ce message audio professionnel infirmier. Extrais-en le contenu clinique pur, sans fioritures." }
        ]
      }
    });
    return { transcription: response.text };
  } catch (error) {
    console.error("Gemini transcription error:", error);
    return { transcription: "[Erreur de transcription vocale]" };
  }
};

export const analyzePrescriptionOCR = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/png' } },
          { text: "Analyse cette ordonnance et extrais les données médicales structurées." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prescriber: { type: Type.STRING },
            rpps: { type: Type.STRING },
            datePrescribed: { type: Type.STRING },
            dateExpiry: { type: Type.STRING },
            careDetails: { type: Type.STRING },
            patientName: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini OCR error:", error);
    return {};
  }
};

export const transcribeMeeting = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Résume cette réunion de cabinet IDEL en décisions et tâches: ${text}`,
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
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini coordination error:", error);
    return { decisions: [], tasks: [] };
  }
};