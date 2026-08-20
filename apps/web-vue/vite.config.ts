import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@studio/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
    }
  },
  server: {
    port: 3001,
    host: "0.0.0.0",
    strictPort: true,
    fs: {
      allow: [fileURLToPath(new URL("../..", import.meta.url))]
    }
  }
});
