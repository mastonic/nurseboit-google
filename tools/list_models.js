
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim();
    }
} catch (e) {
    console.log(".env reading error", e);
}

if (!apiKey) {
    console.error("API_KEY not found");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey, apiVersion: 'v1' }); // Testing v1 first

async function listModels() {
    console.log("Listing models for API v1...");
    try {
        const models = await client.models.list();
        for await (const model of models) {
            console.log(`- ${model.name}`);
        }
    } catch (error) {
        console.error("Error listing models v1:", error.message);

        console.log("\nRetrying with v1beta...");
        try {
            const clientBeta = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
            const modelsBeta = await clientBeta.models.list();
            for await (const model of modelsBeta) {
                console.log(`- ${model.name}`);
            }
        } catch (e) {
            console.error("Error listing models v1beta:", e.message);
        }
    }
}

listModels();
