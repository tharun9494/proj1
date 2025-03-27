import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/", // Use absolute path for Vercel deployment
  build: {
    outDir: "dist",
  },
  server: {
    // Vite handles SPA routing automatically
  }
});