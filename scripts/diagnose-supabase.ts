
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

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
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('Erreur lecture table users:', error.message);
            if (error.message.includes('JWT')) {
                console.log('INDICE: Problème de clé API ou de permissions RLS.');
            }
        } else {
            console.log('✅ Connexion réussie ! Table "users" accessible.');
        }
    } catch (e: any) {
        console.error('Exception lors de la connexion:', e.message);
    }

    console.log('\n2. Test d\'écriture (Insertion temporaire dans "tasks")...');
    const testTaskId = '00000000-0000-0000-0000-000000000000'; // UUID factice
    try {
        // Nettoyage préalable si nécessaire
        await supabase.from('tasks').delete().eq('id', testTaskId);

        const { error: insertError } = await supabase.from('tasks').insert([
            {
                id: testTaskId,
                title: 'TEST DIAGNOSTIC',
                priority: 'low',
                status: 'todo'
            }
        ]);

        if (insertError) {
            console.error('❌ Échec de l\'écriture dans "tasks":', insertError.message);
            console.log('INDICE: Vérifiez les politiques RLS dans le tableau de bord Supabase.');
        } else {
            console.log('✅ Écriture réussie !');

            // Suppression du test
            await supabase.from('tasks').delete().eq('id', testTaskId);
            console.log('✅ Nettoyage terminé.');
        }
    } catch (e: any) {
        console.error('Exception lors de l\'écriture:', e.message);
    }
}

diagnose();
