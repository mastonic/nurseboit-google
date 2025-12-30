
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  const buildDate = new Date().toLocaleString('fr-FR');
  
  // On récupère l'URL cible pour le proxy (le VPS n8n réel)
  const n8nTarget = env.VITE_N8N_BASE_URL || env.N8N_BASE_URL || 'http://localhost:5678';
  
  return {
    plugins: [react()],
    base: './',
    server: {
      proxy: {
        // Redirection locale pour le développement
        '/api/n8n': {
          target: n8nTarget.startsWith('http') ? n8nTarget : 'http://localhost:5678',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/n8n/, '')
        }
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
    },
  };
});
