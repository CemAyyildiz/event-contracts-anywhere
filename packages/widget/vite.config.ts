import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        demo: resolve(__dirname, "demo/index.html"),
      },
      output: {
        manualChunks: {
          "vendor-sdk": ["@somnia-chain/markets-sdk"],
          "vendor-viem": ["viem"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["@eca/trade-core", "@somnia-chain/markets-sdk", "viem"],
  },
});
