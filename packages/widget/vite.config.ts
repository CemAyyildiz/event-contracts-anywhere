import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

function faucetDevPlugin() {
  return {
    name: "eca-faucet",
    configureServer(server: {
      config: { mode: string };
      middlewares: {
        use: (fn: (req: any, res: any, next: () => void) => void) => void;
      };
    }) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/api/faucet" || req.method !== "POST") {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          void (async () => {
            try {
              const env = loadEnv(server.config.mode, resolve(__dirname), "");
              const { dripTo } = await import("../../api/drip.ts");
              const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
              const result = await dripTo(
                body.address,
                env.FAUCET_PRIVATE_KEY ||
                  env.VITE_PRIVATE_KEY ||
                  process.env.FAUCET_PRIVATE_KEY,
              );
              res.statusCode = result.status;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            } catch (e) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  ok: false,
                  error: e instanceof Error ? e.message : String(e),
                }),
              );
            }
          })();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), faucetDevPlugin()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        slip: resolve(__dirname, "slip/index.html"),
        demo: resolve(__dirname, "demo/index.html"),
        tma: resolve(__dirname, "tma/index.html"),
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
