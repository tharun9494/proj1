import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Ensure correct path resolution
  build: {
    outDir: 'dist', // Default output directory for Vite
  },
  server: {
    historyApiFallback: true, // Ensure SPA routing works
  },
});