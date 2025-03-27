import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // Ensures proper routing for Vite
  build: {
    outDir: "dist",
  },
  server: {
    // Vite handles SPA routing automatically
  }
});