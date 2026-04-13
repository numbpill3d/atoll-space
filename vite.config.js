import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: 'public',
    publicDir: false,
    define: {
      __SUPABASE_URL__:  JSON.stringify(env.SUPABASE_URL  || ''),
      __SUPABASE_ANON__: JSON.stringify(env.SUPABASE_ANON || ''),
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
    server: {
      port: 3000,
      open: true,
    },
    resolve: {
      alias: {
        '/src': new URL('./src', import.meta.url).pathname,
      },
    },
  };
});
