# Worker — AI Administrative Workplace Agent

Office of the President (Provincial Administration). Single repository:

- `backend/`  — Node/Express/Sequelize API (port 4019) + faster-whisper STT sidecar (4020)
- `frontend/` — React (Vite) client
- `deploy/`   — Nginx config reference
- `ecosystem.config.js` — PM2 processes (worker-backend, worker-stt)

App path on droplet: `/srv/apps/worker`  ·  Domain: `worker.eshcloud.com`

Production `.env` lives at `backend/.env` (git-ignored — written on the droplet).
`backend/.env.example` is the safe template. See the deployment steps for the
database creation, PM2, Nginx and SSL sequence (mirrors the MediQlaim blueprint).
