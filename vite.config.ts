
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Property 'cwd' does not exist on type 'Process' in some TS environments
  const env = loadEnv(mode, (process as any).cwd(), '');
  const buildDate = new Date().toLocaleString('fr-FR');
  
  const n8nTarget = env.VITE_N8N_BASE_URL || env.N8N_BASE_URL || 'http://localhost:5678';
  
  return {
    plugins: [react()],
    base: './',
    // Aide à la résolution pour les environnements Node/VPS instables
    resolve: {
      alias: {
        'vite': 'vite'
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_N8N_BASE_URL': JSON.stringify(env.VITE_N8N_BASE_URL || ''),
      'process.env.VITE_N8N_API_KEY': JSON.stringify(env.VITE_N8N_API_KEY || env.N8N_API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ''),
      'process.env.VITE_BUILD_DATE': JSON.stringify(buildDate),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      minify: 'terser',
      sourcemap: false
    },
  };
});
