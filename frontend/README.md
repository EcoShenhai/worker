# Worker — Frontend

React (Vite) client for Worker, the AI administrative workplace agent.

## Develop

```bash
npm install
npm run dev     # proxies /api to http://localhost:4019
```

## Build

```bash
npm run build   # outputs dist/, served by Nginx in production
```

## Pages

- **Dashboard** — workload at a glance
- **Sessions & Recordings** — record/upload audio, transcribe locally, verify
  transcript, generate minutes
- **Documents** — AI drafting, structured editing, review → approve → finalize,
  DOCX export
- **Correspondence** — AI-drafted letters/emails with explicit human send
- **Knowledge Base** — reference material for the assistant
- **Ask Worker / Outstanding Actions** — natural-language workspace commands
- **Administration** — users, audit trail, payments (admin only)

The design is deliberately restrained and official: deep emerald, cool neutrals,
and a serif wordmark, with a letterhead-style document preview.
