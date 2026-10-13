import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In local dev the Vite server proxies API + websocket calls to Flask so the
// JWT cookies stay first-party (same origin as the page).
const backend = process.env.VITE_PROXY_TARGET || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    // The backend's CORS / Socket.IO origin is http://localhost:3000, so fail
    // instead of silently moving to another port when 3000 is taken.
    strictPort: true,
    proxy: {
      "/api": { target: backend, changeOrigin: true },
      "/socket.io": { target: backend, changeOrigin: true, ws: true },
    },
  },
});
