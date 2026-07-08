import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      // In dev mode every .jsx file is accessible as a raw URL (e.g. /Dashboard.jsx).
      // If the browser navigates there directly (Sec-Fetch-Dest: document) it gets
      // the Vite-transformed module source instead of the SPA shell. Redirect those
      // navigations back to "/" so React Router takes over.
      name: "spa-source-file-redirect",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const isBrowserNav = req.headers["sec-fetch-dest"] === "document";
          const isSourceFile = /\.[jt]sx?$/.test(req.url ?? "");
          if (isBrowserNav && isSourceFile) {
            res.writeHead(302, { Location: "/" });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        bypass: (req) => {
          if (req.url === "/api.js") {
            return req.url;
          }
        },
      },
    },
  },
});
