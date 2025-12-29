
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const buildDate = new Date().toLocaleString('fr-FR');
  
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';
  
  // Affichage dans le terminal SSH lors du build pour debug
  console.log('--- 🛠️  BUILD CONFIG AUDIT ---');
  console.log('Supabase URL detected:', supabaseUrl ? '✅ Found' : '❌ MISSING');
  console.log('Supabase Key detected:', supabaseKey ? '✅ Found' : '❌ MISSING');
  console.log('Mode:', mode);
  console.log('------------------------------');

  return {
    plugins: [react()],
    base: './',
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_N8N_BASE_URL': JSON.stringify(env.VITE_N8N_BASE_URL || env.N8N_BASE_URL || ''),
      'process.env.VITE_N8N_API_KEY': JSON.stringify(env.VITE_N8N_API_KEY || env.N8N_API_KEY || ''),
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
