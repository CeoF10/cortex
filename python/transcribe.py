#!/usr/bin/env python3
"""
Módulo de Transcripción y Generación Automática de Subtítulos
Utiliza faster-whisper con decodificación de audio directa de 16kHz para máxima compatibilidad y velocidad.
"""
import sys
import os
import json
import wave
import argparse
import subprocess
import numpy as np

def extract_audio_to_16k_wav(input_media_path, temp_wav_path):
    """Extrae audio a 16kHz mono WAV de 16 bits usando ffmpeg."""
    cmd = [
        "ffmpeg", "-y", "-i", input_media_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        temp_wav_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return res.returncode == 0

def load_wav_as_float32(wav_path):
    """Lee un archivo WAV estándar y lo convierte en array numpy float32 normalizado (-1.0 a 1.0)."""
    with wave.open(wav_path, 'rb') as wf:
        n_frames = wf.getnframes()
        raw_bytes = wf.readframes(n_frames)
        audio = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        return audio

def group_words_to_short_chunks(all_words, max_words=4):
    """
    Agrupa palabras en bloques dinámicos cortos (3 a 4 palabras máx, estilo viral TikTok/Reels)
    con división inteligente por puntuación o pausas naturales.
    """
    chunks = []
    cur = []
    for i, w in enumerate(all_words):
        cur.append(w)
        w_text = w["word"].strip()

        # Condición 1: Límite máximo de palabras (4 palabras)
        is_max = len(cur) >= max_words

        # Condición 2: Fin de frase o cláusula fuerte (. ? ! …)
        is_punct = any(w_text.endswith(p) for p in [".", "?", "!", "...", "…"])

        # Condición 3: Coma o pausa media (, ; :) con al menos 2 palabras
        is_comma = any(w_text.endswith(p) for p in [",", ";", ":"]) and len(cur) >= 2

        # Condición 4: Pausa de silencio entre palabras (> 350ms) con al menos 2 palabras
        has_pause = False
        if i + 1 < len(all_words):
            pause = all_words[i + 1]["start"] - w["end"]
            if pause >= 0.35 and len(cur) >= 2:
                has_pause = True

        if is_max or is_punct or is_comma or has_pause:
            chunks.append(cur)
            cur = []

    if cur:
        chunks.append(cur)
    return chunks

def transcribe_with_faster_whisper(audio_array, model_size="base", language="es"):
    from faster_whisper import WhisperModel
    import ctranslate2

    # Aceleración por Hardware GPU NVIDIA (CUDA) con fallback automático a CPU
    use_cuda = ctranslate2.get_cuda_device_count() > 0
    device = "cuda" if use_cuda else "cpu"
    compute_type = "float16" if use_cuda else "int8"

    try:
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
    except Exception as e:
        model = WhisperModel(model_size, device="cpu", compute_type="int8")

    lang_param = None if language in ["auto", ""] else language
    segments, info = model.transcribe(audio_array, language=lang_param, beam_size=5, word_timestamps=True)
    
    all_extracted_words = []

    for segment in segments:
        text = segment.text.strip()
        if not text:
            continue

        seg_words = []
        if hasattr(segment, 'words') and segment.words:
            for w in segment.words:
                cleaned = w.word.strip()
                if cleaned:
                    seg_words.append({
                        "word": cleaned,
                        "start": round(w.start, 2),
                        "end": round(w.end, 2)
                    })

        # Si el modelo no generó palabras individuales para este segmento, estimarlas
        if not seg_words:
            tokens = text.split()
            if tokens:
                total_duration = max(0.5, segment.end - segment.start)
                time_per_word = total_duration / len(tokens)
                for idx_tok, tok in enumerate(tokens):
                    w_start = segment.start + idx_tok * time_per_word
                    w_end = w_start + time_per_word
                    seg_words.append({
                        "word": tok,
                        "start": round(w_start, 2),
                        "end": round(w_end, 2)
                    })

        all_extracted_words.extend(seg_words)

    # Agrupar en bloques cortos de 3-4 palabras estilo Alex Hormozi / TikTok
    word_chunks = group_words_to_short_chunks(all_extracted_words, max_words=4)

    results = []
    idx = 1
    for chunk in word_chunks:
        if not chunk:
            continue
        chunk_text = " ".join(w["word"] for w in chunk).strip()
        start_t = round(chunk[0]["start"], 2)
        end_t = round(max(start_t + 0.35, chunk[-1]["end"]), 2)

        results.append({
            "id": f"sub_{idx}",
            "start": start_t,
            "end": end_t,
            "text": chunk_text,
            "words": chunk
        })
        idx += 1

    return results

def main():
    parser = argparse.ArgumentParser(description="Auto-subtitle generator for Cortex")
    parser.add_argument("--input", required=True, help="Path to video or audio file")
    parser.add_argument("--model", default="base", help="Model size: tiny, base, small")
    parser.add_argument("--language", default="es", help="Language code (es, en, etc.) or auto")
    args = parser.parse_args()

    input_path = os.path.abspath(args.input)
    if not os.path.exists(input_path):
        print(json.dumps({"status": "error", "message": f"Archivo no encontrado: {input_path}"}))
        sys.exit(1)

    temp_audio = f"/tmp/cortex_audio_{os.getpid()}.wav"
    try:
        # Extraer a 16kHz WAV
        if not extract_audio_to_16k_wav(input_path, temp_audio):
            print(json.dumps({"status": "error", "message": "No se pudo extraer la pista de audio con ffmpeg"}))
            sys.exit(1)

        # Cargar numpy array directamente para evitar problemas con PyAV
        audio_data = load_wav_as_float32(temp_audio)

        try:
            segments = transcribe_with_faster_whisper(audio_data, args.model, args.language)
        except ImportError:
            print(json.dumps({
                "status": "error",
                "code": "DEPENDENCY_MISSING",
                "message": "faster-whisper no está instalado."
            }))
            sys.exit(0)

        print(json.dumps({
            "status": "success",
            "engine": "faster-whisper",
            "segments": segments
        }))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
    finally:
        if os.path.exists(temp_audio):
            try:
                os.remove(temp_audio)
            except Exception:
                pass

if __name__ == "__main__":
    main()
