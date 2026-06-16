import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: ['.'],
    },
  },
  publicDir: 'images',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
