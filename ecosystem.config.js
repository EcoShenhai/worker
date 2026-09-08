// PM2 process configuration for Worker (app root: /srv/apps/worker).
// Usage: cd /srv/apps/worker && pm2 start ecosystem.config.js && pm2 save
const path = require('path');
module.exports = {
  apps: [
    {
      name: 'worker-backend',
      cwd: path.join(__dirname, 'backend'),
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: '4019' },
      max_memory_restart: '400M',
      time: true,
    },
    {
      name: 'worker-stt',
      cwd: path.join(__dirname, 'backend', 'stt-service'),
      script: '.venv/bin/uvicorn',
      args: 'app:app --host 127.0.0.1 --port 4020',
      interpreter: 'none',
      env: { STT_MODEL: 'base.en', STT_DEVICE: 'cpu', STT_COMPUTE_TYPE: 'int8' },
      max_memory_restart: '1500M',
      time: true,
    },
  ],
};
