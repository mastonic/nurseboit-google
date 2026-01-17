
import { GoogleGenAI } from "@google/genai";
import { businessAgent } from "./businessAgent";
import { medicalAgent } from "./medicalAgent";
import { adminAgent } from "./adminAgent";
import { communicationAgent } from "./communicationAgent";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || "", apiVersion: 'v1' });

/**
 * Master Agent Orchestrator (BMAD)
 */
export const masterAgent = {
    async execute(userMessage: string, context: any) {
        // 1. Triage / Analysis phase
        // API v1 compatibility: Move system instruction and schema to prompt
        const systemPrompt = `Tu es le Master Agent Triage. Détermine quels agents spécialisés doivent être activés : BUSINESS, MEDICAL, ADMIN.
        Réponds UNIQUEMENT avec un JSON valide respectant cette structure :
        {
          "needsBusiness": boolean,
          "needsMedical": boolean,
          "needsAdmin": boolean,
          "reasoning": "string"
        }`;

        const triageResult = await genAI.models.generateContent({
            model: "gemini-1.5-flash-001",
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nAnalyse cette demande pour NurseBot : "${userMessage}"` }] }]
        });

        let triage: any = {};
        try {
            const text = triageResult.text || "{}";
            // Clean markdown code blocks if present
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            triage = JSON.parse(jsonString);
        } catch (e) {
            console.error("Triage JSON parse error", e);
            triage = { needsBusiness: false, needsMedical: false, needsAdmin: false, reasoning: "Error parsing JSON" };
        }

        const agentData: any = {};

        // 2. Specialized Execution phase (Parallel-ish simulated)
        if (triage.needsBusiness) {
            agentData.business = await this.callAgent(businessAgent, userMessage, context);
        }
        if (triage.needsMedical) {
            agentData.medical = await this.callAgent(medicalAgent, userMessage, context);
        }
        if (triage.needsAdmin) {
            agentData.admin = await this.callAgent(adminAgent, userMessage, context);
        }

        // 3. Synthesis / Communication phase
        const finalResponse = await this.callAgent(communicationAgent, userMessage, { ...context, agentData });

        return {
            reply: finalResponse.finalReply,
            intent: agentData.admin?.intent || agentData.medical?.intent || agentData.business?.staffAction || "CHAT",
            actionRequired: triage.needsAdmin || triage.needsBusiness,
            metadata: agentData
        };
    },

    async callAgent(agent: any, message: string, context: any) {
        // API v1 compatibility: Move system instruction and schema to prompt
        const systemPrompt = `${agent.systemInstruction}
        Réponds UNIQUEMENT avec un JSON valide.`;

        const result = await genAI.models.generateContent({
            model: "gemini-1.5-flash-001",
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nContexte: ${JSON.stringify(context)}\nMessage: ${message}` }] }]
        });

        try {
            const text = result.text || "{}";
            // Clean markdown code blocks if present
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("Agent JSON parse error", e);
            return {};
        }
    }
};
