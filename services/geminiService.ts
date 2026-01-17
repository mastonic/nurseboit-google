
import { Role } from "../types";
import { GoogleGenAI, Type } from "@google/genai";
import { getStore } from "./store";

/**
 * Interface de communication avec Gemini API pour NurseBot PRO.
 * Utilise EXCLUSIVEMENT la clé API configurée dans l'environnement.
 */

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || "", apiVersion: 'v1beta' });
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
  try {
    // Convert base64 to Blob
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: mimeType });

    // Use OpenAI Whisper for transcription
    const { transcribeAudio } = await import('./openaiService');
    const transcription = await transcribeAudio(audioBlob);

    return { transcription };
  } catch (error) {
    console.error("Transcription error:", error);
    return { transcription: "[Erreur de transcription]" };
  }
};

export const analyzePrescriptionOCR = async (base64Image: string) => {
  try {
    const { generateCompletion } = await import('./openaiService');

    const systemPrompt = `Tu es un expert en analyse d'ordonnances médicales.
    Réponds UNIQUEMENT avec un JSON valide respectant cette structure :
    {
      "prescriber": "string",
      "datePrescribed": "string",
      "careDetails": "string",
      "patientName": "string"
    }`;

    const userPrompt = `Analyse cette ordonnance et extrais les informations demandées.
    Image: data:image/png;base64,${base64Image}`;

    const result = await generateCompletion(systemPrompt, userPrompt);
    return JSON.parse(result);
  } catch (error) {
    console.error("OCR error:", error);
    return {};
  }
};

export const transcribeMeeting = async (text: string) => {
  const genAI = getAiClient();
  try {
    const prompt = `Synthétise cette réunion : ${text}
     Réponds UNIQUEMENT avec un JSON valide.
     Structure :
     {
       "decisions": ["string"],
       "tasks": [{"title": "string", "owner": "string", "deadline": "string"}]
     }`;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash-001",
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }]
    });
    const resText = response.text || '{"decisions":[], "tasks":[]}';
    const jsonString = resText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Meeting synthesis error:", error);
    return { decisions: [], tasks: [] };
  }
};

export const checkGeminiConnection = async () => {
  const { checkOpenAIConnection } = await import('./openaiService');
  return checkOpenAIConnection();
};
