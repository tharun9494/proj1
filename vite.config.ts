import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Change '/' to './' to support relative paths
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  }
});