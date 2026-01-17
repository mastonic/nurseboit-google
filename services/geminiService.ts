
import { Role } from "../types";
import { GoogleGenAI, Type } from "@google/genai";
import { getStore } from "./store";

/**
 * Interface de communication avec Gemini API pour NurseBot PRO.
 * Utilise EXCLUSIVEMENT la clé API configurée dans l'environnement.
 */

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
};

import { masterAgent } from "./agents/masterAgent";

export const processUserMessage = async (message: string, role: Role, context: any) => {
  try {
    return await masterAgent.execute(message, context);
  } catch (error) {
    console.error("Gemini processUserMessage error:", error);
    return {
      reply: "L'orchestrateur BMAD rencontre une difficulté de synchronisation.",
      intent: "CHAT",
      actionRequired: false,
      metadata: {}
    };
  }
};

export const transcribeVoiceNote = async (base64Audio: string, mimeType: string = "audio/webm") => {
  const genAI = getAiClient();
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { data: base64Audio, mimeType } }, // Use dynamic mimeType
          { text: "Transcris cette transmission. Sois précis sur les constantes médicales." }
        ]
      }]
    });
    return { transcription: response.text };
  } catch (error) {
    console.error("Transcription error:", error);
    return { transcription: "[Erreur de transcription]" };
  }
};

export const analyzePrescriptionOCR = async (base64Image: string) => {
  const genAI = getAiClient();
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/png' } },
          { text: "Extrais les données de l'ordonnance." }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            prescriber: { type: "STRING" },
            datePrescribed: { type: "STRING" },
            careDetails: { type: "STRING" },
            patientName: { type: "STRING" }
          },
          required: ['prescriber', 'careDetails']
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("OCR error:", error);
    return {};
  }
};

export const transcribeMeeting = async (text: string) => {
  const genAI = getAiClient();
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: `Synthétise cette réunion : ${text}` }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            decisions: { type: "ARRAY", items: { type: "STRING" } },
            tasks: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  owner: { type: "STRING" },
                  deadline: { type: "STRING" }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{"decisions":[], "tasks":[]}');
  } catch (error) {
    console.error("Meeting synthesis error:", error);
    return { decisions: [], tasks: [] };
  }
};

export const checkGeminiConnection = async () => {
  const ai = getAiClient();
  try {
    await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: "ping" }] }]
    });
    return { status: 'ok' as const, msg: 'Gemini API Connecté (Flash 1.5 Stable)' };
  } catch (error: any) {
    return { status: 'error' as const, msg: `Gemini Error: ${error.message}` };
  }
};
