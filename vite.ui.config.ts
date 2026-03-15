import { resolve } from "path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true
  }
});
