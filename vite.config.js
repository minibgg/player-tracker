import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "localhost",
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: "localhost",
    port: 5174,
    strictPort: true,
  },
  plugins: [
    react(),
    {
      name: "riot-proxy-server",
      configureServer(server) {
        server.middlewares.use("/api/riot-proxy", async (req, res) => {
          // Handle CORS preflight
          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "*");
            res.statusCode = 204;
            res.end();
            return;
          }

          try {
            const urlObj = new URL(req.url, "http://localhost");
            const targetUrl = urlObj.searchParams.get("url");
            if (!targetUrl) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Missing url query parameter" }));
              return;
            }

            // Only forward to Riot API hosts, otherwise this is an open proxy
            // that would leak the API key to arbitrary URLs
            let target;
            try {
              target = new URL(targetUrl);
            } catch {
              target = null;
            }
            if (
              !target ||
              target.protocol !== "https:" ||
              !target.hostname.endsWith(".api.riotgames.com")
            ) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Target host is not allowed" }));
              return;
            }

            const headers = {};
            const riotToken = req.headers["x-riot-token"];
            if (riotToken) {
              headers["X-Riot-Token"] = riotToken;
            }

            const response = await fetch(targetUrl, {
              method: req.method,
              headers,
            });

            // If Spectator API returns 404, the player is not currently in an active game.
            // Returning HTTP 200 with notInGame: true prevents DevTools from spamming red 404 errors.
            if (
              response.status === 404 &&
              targetUrl.includes("/lol/spectator/v5/active-games/")
            ) {
              res.statusCode = 200;
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  notInGame: true,
                  isInGame: false,
                  status: {
                    message: "No active match found for player",
                    status_code: 404,
                  },
                }),
              );
              return;
            }

            res.statusCode = response.status;
            res.setHeader("Access-Control-Allow-Origin", "*");
            const contentType = response.headers.get("content-type");
            if (contentType) {
              res.setHeader("Content-Type", contentType);
            }

            const arrayBuffer = await response.arrayBuffer();
            res.end(Buffer.from(arrayBuffer));
          } catch (err) {
            console.error("Vite riot-proxy error:", err);
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(
              JSON.stringify({
                error: "Proxy request failed",
                details: err.message,
              }),
            );
          }
        });
      },
    },
  ],
});
