# generate_wavs.py
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
import os
from pathlib import Path

# Load environment variables from .env (expects ELEVENLABS_API_KEY)
load_dotenv()

API_KEY = "sk_e6f2471c731733df100c52d9958bd33549b0b8d1559ff0a6"

# Configure the ElevenLabs client
client = ElevenLabs(api_key=API_KEY)

# Words grouped by difficulty
words = {
    "easy": ["zapp", "zaff"],
    "medium": ["zass", "ziff"],
    "hard": ["zitch", "zetch"],
}

# Settings (change these if you want another voice/model)
VOICE_ID = "TRnaQb7q41oL7sV0w6Bu"
MODEL_ID = "eleven_multilingual_v2"
OUTPUT_FORMAT = "mp3_44100_128"

# Output folder
OUT_DIR = Path("audio_mp3")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def save_audio_from_generator(audio_generator, output_path: Path):
    """Write streaming audio chunks to file."""
    with open(output_path, "wb") as f:
        for chunk in audio_generator:
            if chunk:
                f.write(chunk)


def main():
    print(
        f"Using voice_id={VOICE_ID}, "
        f"model_id={MODEL_ID}, "
        f"output_format={OUTPUT_FORMAT}"
    )

    for difficulty, word_list in words.items():
        for word in word_list:
            output_file = OUT_DIR / f"{difficulty}_{word}.mp3"

            try:
                audio_stream = client.text_to_speech.convert(
                    text=word,
                    voice_id=VOICE_ID,
                    model_id=MODEL_ID,
                    output_format=OUTPUT_FORMAT,
                )

                save_audio_from_generator(audio_stream, output_file)

                print(f"✅ Saved: {output_file}")

            except Exception as e:
                print(f"❌ ERROR generating '{word}': {e}")


if __name__ == "__main__":
    main()