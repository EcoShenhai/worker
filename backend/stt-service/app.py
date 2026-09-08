"""
Worker STT sidecar — local faster-whisper transcription.

Keeps government audio on the host. English-only by default. The Node backend
POSTs an audio file to /transcribe and receives text + timestamped segments.

Run:
    pip install -r requirements.txt
    uvicorn app:app --host 127.0.0.1 --port 4020

Environment:
    STT_MODEL          default "base.en" (tiny.en | base.en | small.en | medium.en)
    STT_DEVICE         "cpu" (default) or "cuda"
    STT_COMPUTE_TYPE   "int8" (cpu default) or "float16" (gpu)
"""
import os
import tempfile

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

MODEL_NAME = os.getenv("STT_MODEL", "base.en")
DEVICE = os.getenv("STT_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("STT_COMPUTE_TYPE", "int8")

app = FastAPI(title="Worker STT Sidecar")

# Model is loaded once and reused. Downloads on first run, then cached locally.
_model = None


def get_model():
    global _model
    if _model is None:
        _model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)
    return _model


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "device": DEVICE}


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form("en"),
    model: str = Form(None),
):
    suffix = os.path.splitext(file.filename or "audio")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        whisper = get_model()
        segments, info = whisper.transcribe(
            tmp_path,
            language=language or "en",
            vad_filter=True,
            beam_size=5,
        )
        seg_list = []
        full_text = []
        for s in segments:
            seg_list.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
            full_text.append(s.text.strip())

        return JSONResponse(
            {
                "model": MODEL_NAME,
                "language": info.language,
                "duration": round(info.duration, 2),
                "text": " ".join(full_text).strip(),
                "segments": seg_list,
            }
        )
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
