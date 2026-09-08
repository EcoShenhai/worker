# Worker — Backend

AI administrative workplace agent for the Office of the President (Provincial
Administration). Node.js / Express / Sequelize / PostgreSQL.

Worker helps officers **capture** meetings and dictation as audio, **transcribe**
it locally, and **draft** minutes, memos, letters, reports and policy briefs with
AI — then routes them through a human **review → approve → finalize** workflow and
files them with a full audit trail. It is an office workplace agent, not a
meeting/conferencing tool.

## What the AI does (and does not do)

- **DeepSeek** is used for **text and reasoning only** — summarising transcripts,
  extracting structured records, and drafting documents. It is never used for
  speech recognition.
- **Speech-to-text** runs **locally** via a `faster-whisper` sidecar. Audio stays
  on the government host. English only.
- **Email is never auto-sent.** The AI drafts; a person clicks send; the send is
  audited.

## Stack

- Express API on port **4019**
- PostgreSQL via Sequelize (migrations + models)
- Local STT sidecar (FastAPI + faster-whisper) on **127.0.0.1:4020**
- JWT auth (access + refresh), RBAC (superadmin / admin / officer / viewer)
- Document generation to branded **DOCX** (`docx`) from structured JSON content
- Payments: M-Pesa (Daraja STK push) + PayPal (Orders v2)

## Quick start (local)

```bash
npm install
cp .env.example .env      # fill in secrets; set DB_SYNC=true for a quick start
npm run db:migrate        # or rely on DB_SYNC in dev
SUPERADMIN_INITIAL_PASSWORD='dev-only-strong-value' npm run db:seed:admin
npm run dev
```

The STT sidecar (separate terminal):

```bash
cd stt-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 4020
```

## Security notes

- The superadmin password is **never** stored in the repo. It is supplied via
  `SUPERADMIN_INITIAL_PASSWORD` only at seed time, and the account is flagged to
  **force a password change on first login**.
- All secrets are environment variables (`.env`, git-ignored).
- Audit logs store metadata and identifiers only — never document bodies, audio,
  or personal data.

## Layout

```
src/
  config/        central configuration
  models/        Sequelize models + associations
  services/      ai/ stt/ documents/ email/ payments/ storage/ audit/
  controllers/   request handlers
  routes/        Express routers (mounted under /api)
  middleware/    auth, rbac, upload, rate limiting, errors
migrations/      schema
seeders/         superadmin bootstrap
stt-service/     faster-whisper FastAPI sidecar
deploy/          nginx + deployment guide
```

See `deploy/README.md` for full droplet setup.
