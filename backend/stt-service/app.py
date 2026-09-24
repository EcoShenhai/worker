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

MODEL_NAME = os.getenv("STT_MODEL", "base.en")  # English (English-only model = best quality)
MULTI_MODEL_NAME = os.getenv("STT_MULTILINGUAL_MODEL", "base")  # every other language
DEVICE = os.getenv("STT_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("STT_COMPUTE_TYPE", "int8")

app = FastAPI(title="Worker STT Sidecar")

# Model is loaded once and reused. Downloads on first run, then cached locally.
_models = {}


def get_model(name):
    if name not in _models:
        _models[name] = WhisperModel(name, device=DEVICE, compute_type=COMPUTE_TYPE)
    return _models[name]


def pick_model(language):
    """Return (model_name, whisper_language).
    English -> English model. Other languages -> multilingual model with the language set explicitly
    (auto-detect mislabels accented English on small models). "auto" detects; not offered in the UI."""
    lang = (language or "en").strip().lower()
    if lang == "auto":
        return MULTI_MODEL_NAME, None
    if lang == "en" or not MODEL_NAME.endswith(".en"):
        return MODEL_NAME, lang
    return MULTI_MODEL_NAME, lang


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "multilingual_model": MULTI_MODEL_NAME, "loaded": sorted(_models), "device": DEVICE}


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
        model_name, whisper_lang = pick_model(language)
        whisper = get_model(model_name)
        segments, info = whisper.transcribe(
            tmp_path,
            language=whisper_lang,
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
                "model": model_name,
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
