
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manuel .env parsing
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        env[match[1]] = value.trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

async function inspect() {
    console.log('--- INSPECTION SCHEMA PATIENTS ---');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Essayer de lire un patient (même s'il n'y en a pas, on verra peut-être les colonnes attendues dans l'erreur ou le résultat vide)
    const { data, error } = await supabase.from('patients').select('*').limit(1);

    if (error) {
        console.error('Erreur lors de la lecture:', error.message);
    } else {
        console.log('Colonnes détectées (si data existe):', data.length > 0 ? Object.keys(data[0]) : 'Aucune donnée pour extraire les colonnes.');
    }

    // Essayer de provoquer une erreur d'insertion pour voir la liste des colonnes si possible
    // (Mais on a déjà l'erreur de l'utilisateur)
}

inspect();
