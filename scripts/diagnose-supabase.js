
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

async function diagnose() {
    console.log('--- DIAGNOSTIC SUPABASE ---');
    console.log('URL:', supabaseUrl);
    console.log('KEY:', supabaseKey ? 'PRÉSENTE (masquée)' : 'MANQUANTE');

    if (!supabaseUrl || !supabaseKey) {
        console.error('Erreur: Identifiants Supabase manquants dans .env');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('\n1. Test de connexion (Lecture des tables)...');
    try {
        const { data, error } = await supabase.from('users').select('id').limit(1);
        if (error) {
            console.error('Erreur lecture table users:', error.message);
            if (error.message.includes('JWT') || error.message.includes('permission denied')) {
                console.log('INDICE: Problème de clé API ou de permissions RLS.');
            }
        } else {
            console.log('✅ Connexion réussie ! Table "users" accessible.');
        }
    } catch (e) {
        console.error('Exception lors de la connexion:', e.message);
    }

    console.log('\n2. Test d\'écriture (Insertion temporaire dans "tasks")...');
    const testTaskId = '00000000-0000-0000-0000-000000000000'; // UUID factice
    try {
        // Suppression préalable au cas où
        await supabase.from('tasks').delete().eq('id', testTaskId);

        const { error: insertError } = await supabase.from('tasks').insert([
            {
                id: testTaskId,
                title: 'TEST DIAGNOSTIC NURSEBOT',
                priority: 'low',
                status: 'todo'
            }
        ]);

        if (insertError) {
            console.error('❌ Échec de l\'écriture dans "tasks":', insertError.message);
            console.log('INDICE: Vérifiez que les politiques RLS autorisent les insertions anonymes.');
        } else {
            console.log('✅ Écriture réussie !');

            // Suppression du test
            await supabase.from('tasks').delete().eq('id', testTaskId);
            console.log('✅ Nettoyage terminé.');
        }
    } catch (e) {
        console.error('Exception lors de l\'écriture:', e.message);
    }
}

diagnose();
