# IntelliRoute

Smart traffic management system. Full-stack setup (Docker, branches, commit
style) is in [CONTRIBUTING.md](CONTRIBUTING.md).

## Frontend

React 18 + Vite dashboard in `frontend/`, with Leaflet for the map.

### Run with Docker

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:3000. The frontend container serves the built app
through nginx and forwards `/api` and `/socket.io` to the backend.

### Run the dev server

Needs Node 20 LTS. Stop the Docker `frontend` container first, because both
use port 3000.

```bash
cd frontend
npm ci
npm run dev
```

The dev server runs on http://localhost:3000 only (`strictPort`), since backend
CORS and Socket.IO allow that origin alone. It proxies `/api` and `/socket.io`
to the backend on port 5000. On Windows, stop the dev server before running
`npm ci`, or the install fails on locked files.

### Scripts

| Command           | What it does                       |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Dev server with hot reload         |
| `npm run build`   | Production build into `dist/`      |
| `npm run preview` | Serve the production build locally |
| `npm test`        | Run the Vitest unit tests once     |

### Environment flags

| Variable            | Default                 | Purpose                                                     |
| ------------------- | ----------------------- | ----------------------------------------------------------- |
| `VITE_API_BASE`     | `/api`                  | Base URL for API calls                                      |
| `VITE_USE_MOCKS`    | unset                   | `true` replaces the live socket with a fake feed (dev only) |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | Backend address the dev server proxies to                   |

Example: `VITE_USE_MOCKS=true npm run dev` shows moving traffic on the Live
Monitoring tab without the backend sending data.

### Logging in

Log in with the official ID (for example `A001`), not the username. Roles
decide which tabs are visible: Live Monitoring (operator, admin), Analytics
(analyst, admin), Forecast (all) and System Management (admin).
