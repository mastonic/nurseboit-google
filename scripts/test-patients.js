
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

async function seed() {
    console.log('--- TEST INSERT PATIENTS ---');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('\nEssai d\'insertion dans patients...');
    const patientsToInsert = [
        {
            first_name: 'Alice',
            last_name: 'Dupont',
            phone: '0611223344',
            address: '10 Rue de la Paix, Paris',
            care_type: 'Pansement'
        }
    ];

    const { error: patientError } = await supabase
        .from('patients')
        .insert(patientsToInsert);

    if (patientError) {
        console.error('❌ Échec insertion patients:', patientError.message);
    } else {
        console.log('✅ Insertion patients réussie !');
    }
}

seed();
