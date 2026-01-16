
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

async function diagnose() {
    const apiKey = process.env.API_KEY;
    console.log("--- DIAGNOSTIC GEMINI API (SDK 1.37) ---");
    console.log("Clé détectée (tronquée) :", apiKey ? `${apiKey.substring(0, 5)}...` : "AUCUNE CLÉ DANS .env");

    if (!apiKey) return;

    const genAI = new GoogleGenAI({ apiKey });

    try {
        console.log("\n1. Test de liste des modèles...");
        const models = await genAI.models.list();
        console.log("Modèles disponibles :");
        for (const m of models) {
            console.log(`- ${m.name}`);
        }

        console.log("\n2. Test de génération simple (gemini-1.5-flash)...");
        try {
            const result = await genAI.models.generateContent({
                model: "gemini-1.5-flash",
                contents: [{ role: 'user', parts: [{ text: "ping" }] }]
            });
            console.log("Réponse Flash 1.5 :", result.text);
        } catch (e: any) {
            console.error("Erreur Flash 1.5 :", e.message);
        }

    } catch (error: any) {
        console.error("\nCRITICAL ERROR:", error.message);
    }
}

diagnose();
