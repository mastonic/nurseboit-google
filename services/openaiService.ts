import OpenAI from 'openai';

/**
 * Service OpenAI pour NurseBot PRO
 * Remplace Google Gemini pour éviter les restrictions géographiques
 */

const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
        console.error("OPENAI_API_KEY not found in environment variables");
    }
    return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
};

/**
 * Transcribe audio using OpenAI Whisper
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const client = getOpenAIClient();
    try {
        // Convert Blob to File (required by OpenAI SDK)
        const file = new File([audioBlob], "audio.webm", { type: audioBlob.type });

        const transcription = await client.audio.transcriptions.create({
            file: file,
            model: "whisper-1",
            language: "fr", // French for better accuracy
        });

        return transcription.text;
    } catch (error: any) {
        console.error("OpenAI Transcription error:", error);
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
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini", // Cost-effective model
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature,
            response_format: { type: "json_object" } // Force JSON output
        });

        return completion.choices[0]?.message?.content || "{}";
    } catch (error: any) {
        console.error("OpenAI Completion error:", error);
        throw new Error(`AI generation failed: ${error.message}`);
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
