# Worker STT Sidecar (faster-whisper)

Local, free, English-only speech-to-text. Audio never leaves the host.

## Install
```bash
sudo apt-get update && sudo apt-get install -y ffmpeg python3-venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run
```bash
STT_MODEL=base.en uvicorn app:app --host 127.0.0.1 --port 4020
```

Models (English-only, smallest → most accurate): `tiny.en`, `base.en`, `small.en`, `medium.en`.
Start with `base.en`; move to `small.en` if accuracy on Kenyan English is not sufficient.

The Node backend reaches this sidecar at `STT_SERVICE_URL` (default `http://127.0.0.1:4020`).
Under PM2: `pm2 start "uvicorn app:app --host 127.0.0.1 --port 4020" --name worker-stt`
(run from inside the activated venv, or point PM2 at the venv's uvicorn).
