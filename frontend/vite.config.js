import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies API and websocket calls to Flask so the JWT cookies stay
// same-origin.
const backend = process.env.VITE_PROXY_TARGET || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    // Backend CORS / Socket.IO only allow http://localhost:3000, so fail
    // instead of quietly switching ports if 3000 is busy.
    strictPort: true,
    proxy: {
      "/api": { target: backend, changeOrigin: true },
      "/socket.io": { target: backend, changeOrigin: true, ws: true },
    },
  },
});
