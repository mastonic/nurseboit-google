
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// Load .env manually since dotenv might not be present
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) {
        acc[key.trim()] = value.trim();
    }
    return acc;
}, {} as Record<string, string>);

const apiKey = envVars['API_KEY'];

if (!apiKey) {
    console.error("API_KEY not found in .env");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function listModels() {
    console.log("Listing models...");
    try {
        const models = await client.models.list();
        for await (const model of models) {
            console.log(`- ${model.name}`);
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
