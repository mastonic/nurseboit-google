
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // On charge les variables depuis la racine du projet (process.cwd())
  // Le 3ème paramètre '' permet de charger TOUTES les variables, pas seulement celles préfixées par VITE_
  const env = loadEnv(mode, process.cwd(), '');
  const buildDate = new Date().toLocaleString('fr-FR');
  
  // Normalisation des clés pour éviter les erreurs de saisie dans le .env
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';
  const n8nUrl = env.VITE_N8N_BASE_URL || env.N8N_BASE_URL || '';
  const n8nKey = env.VITE_N8N_API_KEY || env.N8N_API_KEY || '';

  return {
    plugins: [react()],
    base: './',
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_N8N_BASE_URL': JSON.stringify(n8nUrl),
      'process.env.VITE_N8N_API_KEY': JSON.stringify(n8nKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      'process.env.VITE_BUILD_DATE': JSON.stringify(buildDate),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        input: {
          main: './index.html',
        },
      },
    },
  };
});
