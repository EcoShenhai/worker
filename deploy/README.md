# Deploying Worker to DigitalOcean

Worker runs as two repositories on the existing droplet (`ecocloud-prod-01`),
behind Nginx, managed by PM2, with PostgreSQL as the database and a local
faster-whisper sidecar for transcription.

- Backend: `worker-backend` → Node/Express on port **4019**
- Frontend: `worker-frontend` → static build served by Nginx
- STT sidecar: faster-whisper on **127.0.0.1:4020** (local only)
- Domain: **worker.eshcloud.com**

> Ports 4019/4020 were chosen to avoid the services already running under PM2
> on the droplet (ecooffice 4038-range, ecomeet, cpamind id 44, etc.).

---

## 1. Database

```bash
sudo -u postgres psql
CREATE DATABASE worker;
CREATE USER worker WITH ENCRYPTED PASSWORD 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON DATABASE worker TO worker;
\q
```

## 2. Backend

```bash
cd /var/www
git clone https://github.com/EcoShenhai/worker-backend.git
cd worker-backend
npm ci
cp .env.example .env
# Edit .env: DB creds, JWT secrets (openssl rand -hex 48), DeepSeek key,
# SMTP, M-Pesa, PayPal. Leave SUPERADMIN_INITIAL_PASSWORD blank for now.
nano .env

# Create the schema
npm run db:migrate

# Seed the superadmin — set the one-off password inline, then it is gone
SUPERADMIN_INITIAL_PASSWORD='a-strong-one-off-value' npm run db:seed:admin
```

## 3. STT sidecar (faster-whisper)

```bash
cd /var/www/worker-backend/stt-service
sudo apt-get update && sudo apt-get install -y ffmpeg python3-venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
```

## 4. Start with PM2

```bash
cd /var/www/worker-backend
pm2 start ecosystem.config.js
pm2 save
```

Check: `pm2 list` should show `worker-backend` (4019) and `worker-stt` (4020) online.
`curl localhost:4019/health` should return `{"status":"ok"}`.

## 5. Frontend

```bash
cd /var/www
git clone https://github.com/EcoShenhai/worker-frontend.git
cd worker-frontend
npm ci
npm run build
sudo mkdir -p /var/www/worker
sudo cp -r dist/* /var/www/worker/
```

## 6. Nginx + TLS

```bash
sudo cp /var/www/worker-backend/deploy/nginx.conf /etc/nginx/sites-available/worker.eshcloud.com
# (or copy from wherever you keep deploy/)
sudo ln -s /etc/nginx/sites-available/worker.eshcloud.com /etc/nginx/sites-enabled/
sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx

# DNS: point an A record for worker.eshcloud.com at the droplet IP first.
sudo certbot --nginx -d worker.eshcloud.com
```

## 7. First login

Visit https://worker.eshcloud.com, sign in as `pskipchumba@gmail.com` with the
one-off password you seeded. You will be forced to set a new password before
anything else.

---

## Updating later

Backend:
```bash
cd /var/www/worker-backend && git pull && npm ci && npm run db:migrate && pm2 restart worker-backend
```
Frontend:
```bash
cd /var/www/worker-frontend && git pull && npm ci && npm run build && sudo cp -r dist/* /var/www/worker/
```

## Automated deploys (optional)

`.github/workflows/deploy.yml` in each repo will SSH to the droplet and run the
update steps on push to `main`. Add these repository secrets:
`DO_HOST`, `DO_USER`, `DO_SSH_KEY`.
