import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  publicDir: '../public',
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
});
