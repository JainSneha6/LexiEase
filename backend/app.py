from flask import Flask, request, jsonify, send_file
from flask import Flask, request, jsonify, send_file, abort
from werkzeug.utils import safe_join
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import os
import time
import re
import traceback
from pathlib import Path
from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv
import uuid
from google import genai
from google.genai import types
from datetime import datetime

load_dotenv()
# Configure APIs (set env vars)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVEN_VOICE_ID = os.getenv("ELEVEN_VOICE_ID", "TRnaQb7q41oL7sV0w6Bu")

if not GEMINI_API_KEY or not ELEVENLABS_API_KEY:
    raise RuntimeError("Please set GEMINI_API_KEY and ELEVENLABS_API_KEY in .env")

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL_NAME = "gemini-2.5-flash"

# configure ElevenLabs
eleven = ElevenLabs(api_key=ELEVENLABS_API_KEY)
ELEVEN_OUTPUT_FORMAT = "mp3_44100_128"  # valid output format


app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "http://localhost:3000"}})

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['JWT_SECRET_KEY'] = 'super-secret-key' 
db = SQLAlchemy(app)
jwt = JWTManager(app)  

UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)
    test_score = db.Column(db.Integer, default=0)

class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True)   # nullable for anonymous (we only persist for logged in users)
    role = db.Column(db.String(20), nullable=False)  # "user" or "assistant"
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    existing_user = User.query.filter_by(email=data['email']).first()
    if existing_user:
        return jsonify(message='User already exists!'), 409

    new_user = User(email=data['email'], password=generate_password_hash(data['password'], method='pbkdf2:sha256'))
    db.session.add(new_user)
    db.session.commit()
    return jsonify(message='User created successfully!'), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password, data['password']):
        access_token = create_access_token(identity=user.id)
        return jsonify(message='Login successful!', access_token=access_token), 200
    return jsonify(message='Invalid email or password!'), 401

@app.route('/api/save-reading-results', methods=['POST'])
def save_reading_results():
    data = request.get_json()
    reading_speed = data.get('readingSpeed')
    time_taken = data.get('timeTaken')

    print(f"Reading Speed: {reading_speed}, Time Taken: {time_taken}")

    return jsonify(message='Reading results saved successfully!'), 200

@app.route('/api/upload-audio', methods=['POST'])
def upload_audio():
    if 'audio' not in request.files:
        return jsonify(message='No audio file provided!'), 400

    audio_file = request.files['audio']
    audio_path = os.path.join('uploads', 'reading_test.wav')
    audio_file.save(audio_path)

    # TEMP values (frontend already computes these)
    speed = float(request.form.get("readingSpeed", 0))
    time_taken = float(request.form.get("timeTaken", 0))

    fluency_score, feedback_text = assess_fluency_and_feedback(
        audio_path,
        speed,
        time_taken
    )

    # Convert feedback → speech
    feedback_audio = tts_generate_and_save(feedback_text)

    return jsonify(
        fluency_rating=fluency_score,
        feedback_text=feedback_text,
        feedback_audio=feedback_audio
    ), 200


def assess_fluency_and_feedback(audio_path, speed, time_taken):
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    prompt = f"""
You are a kind reading coach helping a learner with dyslexia.

Evaluate the reading based on the audio.

Return:
1. A fluency score from 0 to 100 (number only)
2. A short spoken feedback (max 4 sentences)

Rules:
- Use very simple language
- Be encouraging
- Mention one good thing
- Suggest ONE gentle improvement
- Mention mispronounced words if any
- Do NOT be harsh
"""

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[
            types.Part.from_bytes(
                data=audio_bytes,
                mime_type="audio/wav"
            ),
            f"""
Reading speed: {speed} words per minute
Time taken: {time_taken:.2f} seconds

{prompt}
"""
        ],
    )

    text = response.text.strip()

    # --- Extract fluency score ---
    score = 0
    feedback = text

    import re
    match = re.search(r"(\d{1,3})", text)
    if match:
        score = int(match.group(1))

    return score, feedback



# --- Updated endpoints using handle_gemini_prompt ---

@app.route('/api/writing-assistant', methods=['POST'])
def writing_assistant():
    user_text = request.form.get('text')
    image_file = request.files.get('image')

    if not user_text and not image_file:
        return jsonify(message='No text or image provided!'), 400

    try:
        if user_text:
            prompt = f"Improve the coherence for the following text for a dyslexic reader (short and simple):\n\n{user_text}"
            improved_text = handle_gemini_prompt(text_prompt=prompt)
            return jsonify(message='Text improved successfully!', improved_text=improved_text), 200

        # image path branch
        image_path = save_file(image_file, 'user_image')
        prompt = "Improve the coherence for the text contained in this image. Return only the improved text, short and easy to understand for a dyslexic person."
        improved_text = handle_gemini_prompt(file_path=image_path, text_prompt=prompt)
        return jsonify(message='Response generated successfully!', improved_text=improved_text), 200

    except Exception as e:
        print(f"Error generating improved text: {e}")
        traceback.print_exc()
        return jsonify(message='Error generating improved text!'), 500


@app.route('/api/writing-assistant-spelling', methods=['POST'])
def writing_assistant_spelling():
    user_text = request.form.get('text')
    image_file = request.files.get('image')

    # Build the spelling prompt once
    base_prompt = (
        "Tell the user about the spelling mistakes for the given text. "
        "Provide a short, concise list and keep suggestions easy to read for a dyslexic person.Just give the words in which the user has made spelling mistakes\n\n"
    )

    try:
        if user_text:
            prompt = base_prompt + user_text
            improved_text = handle_gemini_prompt(text_prompt=prompt)
            return jsonify(message='Text analyzed successfully!', improved_text=improved_text), 200

        # image branch
        image_path = save_file(image_file, 'user_image')
        prompt = base_prompt + "Please extract the text from the image and then list the spelling and sentence formation mistakes."
        improved_text = handle_gemini_prompt(file_path=image_path, text_prompt=prompt)
        return jsonify(message='Response generated successfully!', improved_text=improved_text), 200

    except Exception as e:
        print(f"Error generating content: {e}")
        traceback.print_exc()
        return jsonify(message='Error generating improved text!'), 500
# --------------------------------------------------------------------


    

@app.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    if 'content' not in request.json:
        print("No text content in request!")
        return jsonify(message='No content provided!'), 400

    extracted_text = request.json['content']

    if not extracted_text.strip():
        print("No text extracted from PDF!")
        return jsonify(message='Failed to extract text from the PDF!'), 400

    simplified_text = simplify_text(extracted_text)
    
    important_words = imp_words(simplified_text)
    
    important_words_list = re.findall(r'"([^"]+)"', important_words)

    return jsonify(
        message='PDF uploaded and simplified successfully!',
        simplified_text=simplified_text,
        important_words=important_words_list  
    ), 200

def simplify_text(text):
    prompt = (
        "Simplify the following text to make it more understandable:\n"
        f"'{text}'"
    )
    try:
        response = model.generate_content([prompt])
        simplified_text = response.text.replace('**','').replace('*','')
        return simplified_text
    except Exception as e:
        print(f"Error simplifying text: {e}")
        return "Error simplifying text."
    
def imp_words(text):
    prompt = (
        "Give me only most important words from the text in the form of an array.:\n"
        f"'{text}'"
    )
    try:
        response = model.generate_content([prompt])
        words = response.text.replace('**','').replace('*','')
        return words
    except Exception as e:
        print(f"Error simplifying text: {e}")
        return "Error simplifying text."
    
@app.route('/api/upload-pdf-notes', methods=['POST'])
def upload_pdf_notes():
    if 'content' not in request.json:
        print("No text content in request!")
        return jsonify(message='No content provided!'), 400

    extracted_text = request.json['content']

    if not extracted_text.strip():
        print("No text extracted from PDF!")
        return jsonify(message='Failed to extract text from the PDF!'), 400

    simplified_text = generate_notes(extracted_text)
    
    important_words = imp_words(simplified_text)
    
    important_words_list = re.findall(r'"([^"]+)"', important_words)
    
    important_points = extract_key_points_from_gemini(simplified_text)
    
    important_points_list = re.findall(r'"([^"]+)"', important_points)

    return jsonify(
        message='PDF uploaded and simplified successfully!',
        simplified_text=simplified_text,
        important_words=important_words_list,
        important_points=important_points_list
    ), 200

def generate_notes(text):
    print(text)
    prompt = (
        "Generate proper notes from the text provided.:\n"
        f"'{text}'"
    )
    try:
        response = model.generate_content([prompt])
        simplified_text = response.text.replace('**','').replace('*','')
        return simplified_text
    except Exception as e:
        print(f"Error simplifying text: {e}")
        return "Error simplifying text."
    
def extract_key_points_from_gemini(text):
    prompt = (
        "Provide 5 consice points to create a mindmap in the form of an array:\n"
        f"'{text}'"
    )
    try:
        response = model.generate_content([prompt])
        key_points = response.text.replace('**','').replace('*','')
        print(key_points)
        return key_points
    except Exception as e:
        print(f"Error extracting key points: {e}")
        return []
    
def save_file(file, prefix):
    """Save uploaded file securely and return path."""
    filename = secure_filename(f"{prefix}_{file.filename}")
    filepath = UPLOAD_FOLDER / filename
    file.save(str(filepath))
    return str(filepath)

def handle_gemini_prompt(file_path=None, text_prompt=None):
    try:
        parts = []

        # Attach file if provided
        if file_path:
            with open(file_path, "rb") as f:
                data = f.read()

            if file_path.lower().endswith((".png", ".jpg", ".jpeg")):
                mime = "image/jpeg"
            elif file_path.lower().endswith(".wav"):
                mime = "audio/wav"
            elif file_path.lower().endswith(".mp3"):
                mime = "audio/mpeg"
            else:
                mime = "application/octet-stream"

            parts.append(
                types.Part.from_bytes(
                    data=data,
                    mime_type=mime
                )
            )

        # Add text prompt
        if text_prompt:
            parts.append(text_prompt)

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=parts,
        )

        return response.text.strip()

    except Exception as e:
        print("Gemini Error:", e)
        traceback.print_exc()
        return "Sorry, I couldn't process that request."

    
@app.route("/api/audio/<path:filename>", methods=["GET"])
def serve_audio(filename):
    """Serve audio files from uploads safely."""
    # Prevent path traversal
    safe_path = safe_join(str(UPLOAD_FOLDER), filename)
    if not safe_path:
        abort(404)
    full_path = Path(safe_path)
    if not full_path.exists():
        abort(404)
    # Use send_file with proper mimetype
    return send_file(str(full_path), mimetype="audio/mpeg")
    
@app.route("/api/ask", methods=["POST"])
def ask():
    """
    Accepts form-data:
    - text (optional)
    - image (optional file)
    - audio (optional file)  <-- will be sent to Gemini as a file (Gemini can accept uploaded audio)
    Returns JSON: {response: text, audio_filename: "<name>.mp3"}
    """
    try:
        user_text = request.form.get("text")
        user_image = request.files.get("image") if "image" in request.files else None
        user_audio = request.files.get("audio") if "audio" in request.files else None

        # Build prompt / call Gemini
        if user_text and user_image:
            image_path = save_file(user_image, "user_image")
            prompt = f"Answer clearly and simply for a dyslexic person: '{user_text}'"
            g_response = handle_gemini_prompt(file_path=image_path, text_prompt=prompt)
        elif user_text:
            prompt = f"Answer clearly and simply for a dyslexic person: '{user_text}'"
            g_response = handle_gemini_prompt(text_prompt=prompt)
        elif user_image:
            image_path = save_file(user_image, "user_image")
            prompt = "Describe the image and answer simply for a dyslexic person."
            g_response = handle_gemini_prompt(file_path=image_path, text_prompt=prompt)
        elif user_audio:
            audio_path = save_file(user_audio, "user_audio")
            prompt = "Transcribe or answer the question asked in this audio, keep the reply short and dyslexic-friendly."
            g_response = handle_gemini_prompt(file_path=audio_path, text_prompt=prompt)
        else:
            return jsonify(message="No valid input provided!"), 400

        # Generate TTS for the bot reply
        audio_filename = tts_generate_and_save(g_response)
        if audio_filename is None:
            # TTS failed: return text only
            return jsonify(message="Response generated", response=g_response, audio_filename=None), 200

        return jsonify(message="Response generated", response=g_response, audio_filename=audio_filename), 200

    except Exception as e:
        print("Error in /api/ask:", e)
        traceback.print_exc()
        return jsonify(message="Error generating response"), 500
    
total_questions = 0
correct_answers = 0

def allowed_file(filename):
    """Check if the uploaded file has a valid extension."""
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def check_spelling_from_image(img_path, word):
    global correct_answers
    global total_questions

    try:
        # Read image bytes
        with open(img_path, "rb") as f:
            image_bytes = f.read()

        # Build image part correctly
        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type="image/png"
        )

        prompt = (
            "Read the handwritten word in this image. "
            "Reply with ONLY the word, no explanation."
        )

        # Call Gemini
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                image_part,
                prompt
            ]
        )

        result = (response.text or "").strip()
        print("Gemini OCR result:", result)

        total_questions += 1

        if result.lower() == word.lower():
            correct_answers += 1
            return "Correct"

        return "Incorrect"

    except Exception as e:
        print("Error while checking spelling:", e)
        traceback.print_exc()
        raise


def tts_generate_and_save(text, voice_id=ELEVEN_VOICE_ID, output_format=ELEVEN_OUTPUT_FORMAT):
    """Call ElevenLabs to synthesize text and save MP3 file. Returns filename."""
    # create unique filename
    filename = f"bot_resp_{uuid.uuid4().hex}.mp3"
    filepath = UPLOAD_FOLDER / filename

    try:
        audio_generator = eleven.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            output_format=output_format,
        )
        # write chunks
        with open(filepath, "wb") as f:
            for chunk in audio_generator:
                if chunk:
                    f.write(chunk)
        return filename
    except Exception as e:
        print("ElevenLabs TTS error:", e)
        traceback.print_exc()
        return None


@app.route('/api/upload_image', methods=['POST'])
def upload_image():
    """Handle image upload and check spelling."""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400

        image_file = request.files['image']
        word = request.form.get('word')

        if not image_file or not allowed_file(image_file.filename):
            return jsonify({'error': 'Invalid or no image file provided'}), 400

        if not word:
            return jsonify({'error': 'No word provided'}), 400

        filename = secure_filename(f'{word}.png')
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        image_file.save(filepath)

        result = check_spelling_from_image(filepath.replace('\\','/'), word)

        return jsonify({'result': result, 'word': word})

    except Exception as e:
        print(f"An error occurred while processing the image: {e}")
        traceback.print_exc()  
        return jsonify({'error': 'An error occurred while processing the image'}), 500

@app.route('/api/submit_results', methods=['POST'])
def submit_results():
    """Handle submission of results and calculate score."""
    global total_questions
    global correct_answers

    try:
        if total_questions == 0:
            return jsonify({'score': 0, 'total_questions': 0, 'correct_answers': 0})

        score_percentage = (correct_answers / total_questions) * 100
        total_questions = 0
        correct_answers = 0

        return jsonify({
            'score': score_percentage,
            'total_questions': total_questions,
            'correct_answers': correct_answers
        })

    except Exception as e:
        print(f"An error occurred while calculating the score: {e}")
        traceback.print_exc()  
        return jsonify({'error': 'An error occurred while calculating the score'}), 500
    
def _build_system_prompt():
    return (
        "You are Lexi — a friendly assistant for learners with dyslexia. "
        "Keep answers short (1-4 short sentences), use plain words, give examples when helpful, "
        "ask one follow-up question if appropriate, and avoid complex punctuation. "
        "When asked about site pages, give a short description and a suggestion to navigate."
    )

def _build_prompt_from_history(history_messages, context=None):
    parts = []
    if context:
        parts.append(f"Context: {context}\n\n")
    parts.append(_build_system_prompt() + "\n\n")
    # append messages in chronological order
    for m in history_messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if role == "user":
            parts.append(f"User: {content}\n")
        else:
            parts.append(f"Assistant: {content}\n")
    parts.append("\nAnswer succinctly and simply:")
    return "\n".join(parts)


@app.route("/api/chat", methods=["POST"])
def chat_endpoint():
    """
    Expects JSON: { message: "<user text>", context: "<short optional context>", voice_id: "<optional>" }
    Returns: { response: "<assistant text>", audio_filename: "<mp3 or null>" }
    """
    try:
        # optional auth: persists messages if you have ChatMessage model; otherwise proceed anonymous
        try:
            verify_jwt_in_request_optional()
            user_id = get_jwt_identity()
        except Exception:
            user_id = None

        data = request.get_json(force=True, silent=True) or {}
        user_message = (data.get("message") or "").strip()
        context = data.get("context", "").strip()
        voice_id = data.get("voice_id") or ELEVEN_VOICE_ID
        page = data.get("page", "")


        if not user_message:
            return jsonify(message="No message provided"), 400

        # Build a short system prompt tuned for dyslexic-friendly output:
        PAGE_SYSTEM_PROMPTS = {
    "home": """
You are Lexi, a friendly assistant helping users explore the platform.
Explain what each feature does in simple language.
Features in this are dyslexia-screening-tests, customized-learning-path, writing-support, document conversion-learning aids, chatbot & consultation.
Help users decide where to go next.
Keep responses short, supportive, and dyslexia-friendly.
""",

    "dyslexia-screening-tests": """
You are helping the user take a dyslexia screening test.
Explain what the test measures, how to start it, and what results mean.
Encourage them gently and reduce anxiety.
Do not overwhelm with technical terms.
There are three tests phonological awareness tests which provides the audio of the word and the user needs to write that word, Kauffman assessment battery test which provides a sequence and the user needs to recreate that and gray oral reading test where the user needs to read the passage provided.
""",
    "phonological-awareness-test": """
You are helping the user take a dyslexia screening test.
Explain what the test measures, how to start it, and what results mean.
Encourage them gently and reduce anxiety.
Do not overwhelm with technical terms.
provides the audio of the word and the user needs to write that word
""",
"kauffman-battery-assessment-test": """
You are helping the user take a dyslexia screening test.
Explain what the test measures, how to start it, and what results mean.
Encourage them gently and reduce anxiety.
Do not overwhelm with technical terms.
Recreate the sequence provided.
""",
"gray-oral-reading-test": """
You are helping the user take a dyslexia screening test.
Explain what the test measures, how to start it, and what results mean.
Encourage them gently and reduce anxiety.
Do not overwhelm with technical terms.
user needs to read the passage provided.
""",
    "customized-learning-path": """
You help users understand personalized learning paths.
Explain how learning paths adapt to strengths and difficulties.
Guide them to choose mild, moderate, or severe paths when asked.
Use very simple explanations.
""",

    "mild-learning-path": """
You are guiding a learner on the mild difficulty learning path.
Explain activities slowly and encourage confidence.
Give step-by-step help when asked.
""",

    "moderate-learning-path": """
You are guiding a learner on the moderate difficulty learning path.
Explain tasks clearly with structure.
Encourage practice and reassure the learner.
""",

    "severe-learning-path": """
You are supporting learners with severe difficulties.
Use very short sentences.
Be calm, reassuring, and encouraging.
Explain one step at a time.
""",

    "writing-assistant": """
You help users improve writing.
You can:
- fix spelling
- simplify sentences
- rewrite text clearly
- explain mistakes gently
Keep explanations short and friendly.
""",

    "document-support": """
You help users work with documents.
You can:
- explain uploaded documents
- simplify text
- extract key points
- help with notes
Use short, easy explanations.
""",

    "document-simplifier": """
You help simplify long or difficult text.
Rewrite content using easy words.
Keep sentences short.
Avoid complex vocabulary.
""",

    "mindmap-generator": """
You help turn text into structured ideas or mind maps.
Explain how to break content into key points.
Use bullet-style thinking.
""",

    "reading-assistance": """
You help users improve reading.
Explain meanings of sentences.
Help with pronunciation.
Encourage slow and confident reading.
""",

    "phonological-assistant": """
You help with phonics and sound awareness.
Focus on sounds, syllables, and pronunciation.
Give short examples.
""",

    "reading-comprehension": """
You help users understand what they read.
Explain meanings in simple language.
Ask gentle questions to check understanding.
""",

    "memory-game": """
You help users with memory exercises.
Explain rules simply.
Encourage practice and patience.
""",

    "chatbot": """
You are a general helper chatbot.
Answer clearly, kindly, and simply.
Guide users to platform features when helpful.
""",

    "default": """
You are Lexi, a friendly assistant for users with dyslexia.
Use simple words.
Keep responses short.
Be supportive and calm.
Ask one helpful follow-up question when appropriate.
"""
}
        page_key = page.strip().lower() if page else "default"

        system_prompt = PAGE_SYSTEM_PROMPTS.get(page_key, PAGE_SYSTEM_PROMPTS["default"])
        if page:
            system_prompt += f"\nThe user is currently on the page: {page}. "
            system_prompt += "Guide them specifically for this page."
        # Compose text prompt for Gemini (include recent user message + optional context)
        prompt_parts = [system_prompt]
        if context:
            prompt_parts.append(f"Context: {context}")
        prompt_parts.append(f"User: {user_message}")
        prompt_parts.append("\nAnswer succinctly and simply:")
        prompt = "\n\n".join(prompt_parts)

        # Call your Gemini wrapper helper (returns text)
        assistant_text = handle_gemini_prompt(text_prompt=prompt)

        if not assistant_text:
            assistant_text = "Sorry, I couldn't generate a response."

        # Try to make TTS using ElevenLabs helper
        audio_filename = None
        try:
            audio_filename = tts_generate_and_save(assistant_text, voice_id=voice_id, output_format=ELEVEN_OUTPUT_FORMAT)
        except Exception as e:
            print("TTS generation failed in /api/chat:", e)
            audio_filename = None

        return jsonify(response=assistant_text, audio_filename=audio_filename), 200

    except Exception as e:
        print("Error in /api/chat:", e)
        traceback.print_exc()
        return jsonify(message="Error generating chat response"), 500


@app.route("/api/tts", methods=["POST"])
def tts_endpoint():
    """
    Body: { text: "<text to synthesize>", voice_id: "<optional voice id>" }
    Returns: { audio_filename: "<mp3>" } or 500 on failure.
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        text = (data.get("text") or "").strip()
        voice_id = data.get("voice_id") or ELEVEN_VOICE_ID

        if not text:
            return jsonify(message="No text provided"), 400

        filename = tts_generate_and_save(text, voice_id=voice_id, output_format=ELEVEN_OUTPUT_FORMAT)
        if not filename:
            return jsonify(message="TTS failed"), 500

        return jsonify(audio_filename=filename), 200
    except Exception as e:
        print("TTS endpoint error:", e)
        traceback.print_exc()
        return jsonify(message="Error synthesizing audio"), 500

@app.route("/api/verify-object", methods=["POST"])
def verify_object():
    data = request.get_json()
    user_answer = (data.get("answer") or "").lower().strip()
    correct_word = (data.get("correct") or "").lower().strip()

    if not user_answer:
        return jsonify({"ok": False, "message": "Please say something."}), 400

    prompt = f"""
You are checking if a child correctly named an object.

Correct word: "{correct_word}"
User said: "{user_answer}"

Reply ONLY with:
YES  → if the meaning or pronunciation matches
NO   → if it does not match
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[prompt]
        )

        result = (response.text or "").strip().upper()

        is_correct = "YES" in result

        if is_correct:
            feedback = "Yes, that is correct. Now spell the word."
        else:
            feedback = "Not quite. Look again and try saying the word."

        audio_file = tts_generate_and_save(feedback)

        return jsonify(
            correct=is_correct,
            feedback=feedback,
            audio_filename=audio_file
        )

    except Exception as e:
        print("verify_object error:", e)
        traceback.print_exc()

        return jsonify(
            correct=False,
            feedback="Something went wrong. Please try again.",
            audio_filename=None
        ), 500


    
if __name__ == '__main__':
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    with app.app_context():
        db.create_all()
    app.run(debug=True)
