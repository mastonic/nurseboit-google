
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
    console.log('--- SEEDING SUPABASE DATA ---');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Create Users
    console.log('\n1. Création des utilisateurs...');
    const usersToInsert = [
        { first_name: 'Jean', last_name: 'Admin', role: 'admin', pin: '1234', phone: '0600000001', active: true },
        { first_name: 'Marie', last_name: 'Infirmier', role: 'infirmiere', pin: '0000', phone: '0600000002', active: true },
        { first_name: 'Pierre', last_name: 'Soignant', role: 'infirmiere', pin: '1111', phone: '0600000003', active: true }
    ];

    const { data: insertedUsers, error: userError } = await supabase
        .from('users')
        .insert(usersToInsert)
        .select();

    if (userError) {
        console.error('Erreur lors de la création des utilisateurs:', userError.message);
        return;
    }
    console.log('✅ 3 utilisateurs créés avec succès.');

    const adminId = insertedUsers.find(u => u.role === 'admin')?.id;

    // 2. Create Patients
    console.log('\n2. Création des patients...');
    const patientsToInsert = [
        {
            first_name: 'Alice',
            last_name: 'Dupont',
            phone: '0611223344',
            address: '10 Rue de la Paix, Paris',
            care_type: 'Pansement',
            created_by: adminId
        },
        {
            first_name: 'Bob',
            last_name: 'Martin',
            phone: '0622334455',
            address: '25 Avenue de la République, Lyon',
            care_type: 'Injection',
            created_by: adminId
        },
        {
            first_name: 'Charlie',
            last_name: 'Durand',
            phone: '0633445566',
            address: '5 Boulevard des Capucines, Marseille',
            care_type: 'Toilette',
            created_by: adminId
        }
    ];

    const { error: patientError } = await supabase
        .from('patients')
        .insert(patientsToInsert);

    if (patientError) {
        console.error('Erreur lors de la création des patients:', patientError.message);
    } else {
        console.log('✅ 3 patients créés avec succès.');
    }

    console.log('\n--- TERMINÉ ---');
}

seed();
