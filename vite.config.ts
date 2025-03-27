import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',  // Ensure this is set correctly
  build: {
    outDir: 'dist',  // Ensures Vercel picks the correct folder
  },
  server: {
    port: 3000,
  },
});