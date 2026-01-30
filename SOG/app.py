import os
from flask import Flask, render_template, request, jsonify, send_file
from dotenv import load_dotenv
import requests
from io import BytesIO

load_dotenv()

ELEVEN_API_KEY = os.getenv("ELEVENLABS_API_KEY")
DEFAULT_VOICE_ID = os.getenv("ELEVEN_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")
DEFAULT_MODEL_ID = os.getenv("ELEVEN_MODEL_ID", "eleven_multilingual_v2")

if not ELEVEN_API_KEY:
    raise RuntimeError("Missing ELEVENLABS_API_KEY in .env")

app = Flask(__name__)

@app.get("/")
def home():
    return render_template("index.html")

@app.post("/api/tts")
def tts_export():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    voice_id = (data.get("voice_id") or DEFAULT_VOICE_ID).strip()
    output_format = (data.get("output_format") or "mp3_44100_128").strip()
    model_id = (data.get("model_id") or DEFAULT_MODEL_ID).strip()

    if not text:
        return jsonify({"error": "Missing text"}), 400
    if len(text) > 6000:
        return jsonify({"error": "Text too long (demo limit 6000 chars)"}), 400

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    headers = {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }

    payload = {
        "text": text,
        "model_id": model_id,
        "output_format": output_format,
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=60)

    if resp.status_code >= 400:
        print("ElevenLabs error:", resp.status_code, resp.text)
        return resp.text, resp.status_code

    is_wav = output_format.startswith("wav") or output_format == "wav"
    filename = f"tts.{'wav' if is_wav else 'mp3'}"
    mimetype = "audio/wav" if is_wav else "audio/mpeg"

    return send_file(
        BytesIO(resp.content),
        mimetype=mimetype,
        as_attachment=True,
        download_name=filename,
    )

if __name__ == "__main__":
    app.run(debug=True, port=5000)