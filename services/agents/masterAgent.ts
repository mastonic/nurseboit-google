
import { businessAgent } from "./businessAgent";
import { medicalAgent } from "./medicalAgent";
import { adminAgent } from "./adminAgent";
import { communicationAgent } from "./communicationAgent";
import { generateCompletion } from "../openaiService";

/**
 * Master Agent Orchestrator (BMAD)
 * Now powered by OpenAI for global availability
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

        const userPrompt = `Analyse cette demande pour NurseBot : "${userMessage}"`;
        console.log("[MasterAgent] Starting triage...");
        const triageText = await generateCompletion(systemPrompt, userPrompt, 0.3);

        let triage: any = {};
        try {
            triage = JSON.parse(triageText);

            // Check if OpenAI returned an error
            if (triage.error) {
                console.error("[MasterAgent] OpenAI error in triage:", triage.message);
                return {
                    reply: triage.finalReply || "Désolé, j'ai rencontré une erreur technique.",
                    intent: "CHAT",
                    actionRequired: false,
                    metadata: { error: triage.message }
                };
            }
        } catch (e) {
            console.error("[MasterAgent] Triage JSON parse error", e, "Raw:", triageText);
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
        const systemPrompt = `${agent.systemInstruction}
        Réponds UNIQUEMENT avec un JSON valide.`;

        const userPrompt = `Contexte: ${JSON.stringify(context)}\nMessage: ${message}`;

        try {
            console.log(`[MasterAgent] Calling agent...`);
            const resultText = await generateCompletion(systemPrompt, userPrompt, 0.5);
            const result = JSON.parse(resultText);

            // Check if OpenAI returned an error
            if (result.error) {
                console.error("[MasterAgent] OpenAI error in agent:", result.message);
                return {
                    finalReply: result.finalReply || "Erreur lors du traitement de votre demande.",
                    error: true
                };
            }

            console.log("[MasterAgent] Agent response:", result);
            return result;
        } catch (e) {
            console.error("[MasterAgent] Agent JSON parse error", e);
            return { finalReply: "Erreur de traitement.", error: true };
        }
    }
};
