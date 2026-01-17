import OpenAI from 'openai';

/**
 * Service OpenAI pour NurseBot PRO
 * Remplace Google Gemini pour éviter les restrictions géographiques
 */

const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
        console.error("[OpenAI] OPENAI_API_KEY not found in environment variables");
    } else {
        console.log("[OpenAI] API Key found:", apiKey.substring(0, 10) + "...");
    }
    return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
};

/**
 * Transcribe audio using OpenAI Whisper
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const client = getOpenAIClient();
    try {
        console.log("[OpenAI] Transcribing audio, size:", audioBlob.size, "type:", audioBlob.type);
        // Convert Blob to File (required by OpenAI SDK)
        const file = new File([audioBlob], "audio.webm", { type: audioBlob.type });

        const transcription = await client.audio.transcriptions.create({
            file: file,
            model: "whisper-1",
            language: "fr", // French for better accuracy
        });

        console.log("[OpenAI] Transcription success:", transcription.text);
        return transcription.text;
    } catch (error: any) {
        console.error("[OpenAI] Transcription error:", error);
        console.error("[OpenAI] Error details:", error.message, error.status, error.code);
        throw new Error(`Transcription failed: ${error.message}`);
    }
};

/**
 * Generate AI completion with structured JSON output
 */
export const generateCompletion = async (
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.7
): Promise<string> => {
    const client = getOpenAIClient();
    try {
        console.log("[OpenAI] Generating completion...");
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini", // Cost-effective model
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature,
            response_format: { type: "json_object" } // Force JSON output
        });

        const result = completion.choices[0]?.message?.content || "{}";
        console.log("[OpenAI] Completion success:", result.substring(0, 100));
        return result;
    } catch (error: any) {
        console.error("[OpenAI] Completion error:", error);
        console.error("[OpenAI] Error details:", error.message, error.status, error.code);
        // Return a valid JSON error instead of throwing
        return JSON.stringify({
            error: true,
            message: error.message || "OpenAI API error",
            finalReply: "Désolé, j'ai rencontré une erreur technique. Veuillez réessayer."
        });
    }
};

/**
 * Generate AI completion without JSON constraint (for natural language responses)
 */
export const generateText = async (
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.7
): Promise<string> => {
    const client = getOpenAIClient();
    try {
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature
        });

        return completion.choices[0]?.message?.content || "";
    } catch (error: any) {
        console.error("OpenAI Text generation error:", error);
        throw new Error(`Text generation failed: ${error.message}`);
    }
};

/**
 * Check OpenAI API connection
 */
export const checkOpenAIConnection = async (): Promise<{ status: 'ok' | 'error', msg: string }> => {
    const client = getOpenAIClient();
    try {
        await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5
        });
        return { status: 'ok', msg: 'OpenAI API Connected (GPT-4o-mini)' };
    } catch (error: any) {
        return { status: 'error', msg: `OpenAI Error: ${error.message}` };
    }
};
