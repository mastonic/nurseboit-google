
import { GoogleGenAI } from "@google/genai";
import { businessAgent } from "./businessAgent";
import { medicalAgent } from "./medicalAgent";
import { adminAgent } from "./adminAgent";
import { communicationAgent } from "./communicationAgent";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

/**
 * Master Agent Orchestrator (BMAD)
 */
export const masterAgent = {
    async execute(userMessage: string, context: any) {
        // 1. Triage / Analysis phase
        const triageResult = await genAI.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: [{ role: 'user', parts: [{ text: `Analyse cette demande pour NurseBot : "${userMessage}"` }] }],
            config: {
                systemInstruction: "Tu es le Master Agent Triage. Détermine quels agents spécialisés doivent être activés : BUSINESS, MEDICAL, ADMIN.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        needsBusiness: { type: "BOOLEAN" },
                        needsMedical: { type: "BOOLEAN" },
                        needsAdmin: { type: "BOOLEAN" },
                        reasoning: { type: "STRING" }
                    },
                    required: ["needsBusiness", "needsMedical", "needsAdmin"]
                }
            }
        });

        const triage = JSON.parse(triageResult.text || "{}");
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
        const result = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: 'user', parts: [{ text: `Conteste: ${JSON.stringify(context)}\nMessage: ${message}` }] }],
            config: {
                systemInstruction: agent.systemInstruction,
                responseMimeType: "application/json",
                responseSchema: agent.responseSchema
            }
        });
        return JSON.parse(result.text || "{}");
    }
};
