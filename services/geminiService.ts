
import { Role } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

// Fix: Use process.env instead of import.meta.env to resolve Property 'env' does not exist on type 'ImportMeta'
const N8N_BASE_URL = process.env.VITE_N8N_BASE_URL || "";
const N8N_API_KEY = process.env.VITE_N8N_API_KEY || "";

// Fix: Initialize GoogleGenAI client using process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Interface de communication avec Gemini API.
 * Remplace l'orchestrateur n8n par des appels directs au SDK Gemini pour une meilleure fiabilité.
 */

export const processUserMessage = async (message: string, role: Role, context: any) => {
  try {
    // Fix: Use gemini-3-pro-preview for complex reasoning and medical coordination tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: message,
      config: {
        systemInstruction: `Tu es NurseBot, un assistant intelligent pour un cabinet infirmier. 
        Rôle de l'utilisateur: ${role}. 
        Contexte: ${JSON.stringify(context)}.
        Réponds de manière concise et professionnelle. 
        Identifie l'intention parmi: CHAT, TRANSMISSION, PLANNING, PRESCRIPTION, BILLING.
        Retourne uniquement un JSON structuré.`,
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
      reply: "[Mode Démo] Erreur de communication avec l'IA. " + (error as Error).message, 
      intent: "CHAT", 
      actionRequired: false 
    };
  }
};

export const transcribeVoiceNote = async (base64Audio: string, mimeType: string = "audio/webm") => {
  try {
    // Fix: Use gemini-2.5-flash-native-audio-preview-09-2025 for high-quality audio transcription
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType } },
          { text: "Transcrivez fidèlement ce message audio professionnel de soin infirmier. Ne gardez que le texte utile sans commentaires." }
        ]
      }
    });
    return { transcription: response.text };
  } catch (error) {
    console.error("Gemini transcription error:", error);
    return { transcription: "[Erreur de transcription IA]" };
  }
};

export const analyzePrescriptionOCR = async (base64Image: string) => {
  try {
    // Fix: Use gemini-3-pro-preview for OCR as gemini-2.5-flash-image does not support responseSchema
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/png' } },
          { text: "Analysez cette ordonnance médicale et extrayez les données structurées suivantes au format JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prescriber: { type: Type.STRING, description: 'Nom du médecin' },
            rpps: { type: Type.STRING, description: 'Numéro RPPS' },
            datePrescribed: { type: Type.STRING, description: 'Date de prescription YYYY-MM-DD' },
            dateExpiry: { type: Type.STRING, description: 'Date de fin de validité YYYY-MM-DD' },
            careDetails: { type: Type.STRING, description: 'Détails des soins à prodiguer' },
            patientName: { type: Type.STRING, description: 'Nom complet du patient' }
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
    // Fix: Use gemini-3-flash-preview for fast summarization and task extraction from text
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Générez un compte-rendu structuré (décisions et tâches) de cette réunion du cabinet infirmier: ${text}`,
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
    console.error("Gemini staff coordination error:", error);
    return { decisions: [], tasks: [] };
  }
};
