from flask import Flask, request, jsonify, send_file
from flask import Flask, request, jsonify, send_file, abort
from werkzeug.utils import safe_join
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import os

import re
import traceback
from pathlib import Path
from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv
import uuid
from google import genai
from google.genai import types

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
    audio_path = os.path.join('uploads', f'reading_test.wav')
    audio_file.save(audio_path)

    fluency_rating = assess_fluency(audio_path)
    
    print(fluency_rating)

    return jsonify(message='Audio uploaded successfully!', fluency_rating=fluency_rating), 200

def assess_fluency(audio_path):
    prompt = "Rate the fluency of the audio from 100. Just give me the number."
    user_audio_file = genai.upload_file(path=audio_path)
    response = model.generate_content([user_audio_file, prompt])
    
    fluency_rating = extract_fluency_rating(response.text)
    return fluency_rating

def extract_fluency_rating(response_text):
    try:
        fluency_rating = int(response_text.strip())
        return fluency_rating
    except ValueError:
        print("Error extracting fluency rating:", response_text)
        return 0

@app.route('/api/writing-assistant', methods=['POST'])
def writing_assistant():
    user_text = request.form.get('text')
    image_file = request.files.get('image')

    if not user_text and not image_file:
        return jsonify(message='No text or image provided!'), 400

    improved_text = ""

    if user_text:
        prompt = f"Improve the coherence for the following text: '{user_text}'"
        try:
            response = model.generate_content([prompt])
            improved_text = response.text
        except Exception as e:
            print(f"Error generating content for text: {e}")
            return jsonify(message='Error generating improved text!'), 500

    elif image_file:
        try:    
            image_path = save_file(image_file, 'user_image')
            prompt = f"Improve the coherence for the following text in the image given:"
            response = handle_gemini_prompt(file_path=image_path, text_prompt=prompt)
            return jsonify(message='Response generated successfully!', improved_text=response), 200
        except Exception as e:
            print(f"Error generating content for text: {e}")
            return jsonify(message='Error generating improved text!'), 500

    return jsonify(message='Text improved successfully!', improved_text=improved_text), 200

    
@app.route('/api/writing-assistant-spelling', methods=['POST'])
def writing_assistant_spelling():
    user_text = request.form.get('text')
    image_file = request.files.get('image')

    prompt = (
        '''Tell the user about the spelling mistakes and sentence formation mistakes for the given text.
        Provide in a short and concise way keeping in mind this is for a dyslexic person.
        '''
        f"'{user_text}'"
    )

    if user_text:
        try:
            response = model.generate_content([prompt])
            improved_text = response.text.replace('**','').replace("*",'')
            return jsonify(message='Text improved successfully!', improved_text=improved_text), 200
        except Exception as e:
            print(f"Error generating content: {e}")
            return jsonify(message='Error generating improved text!'), 500

    elif image_file:
        try:    
            image_path = save_file(image_file, 'user_image')
            prompt = f'''Tell the user about the spelling mistakes and sentence formation mistakes for the given text.
        Provide in a short and concise way keeping in mind this is for a dyslexic person.'''
            response = handle_gemini_prompt(file_path=image_path, text_prompt=prompt)
            return jsonify(message='Response generated successfully!', improved_text=response), 200
        except Exception as e:
            print(f"Error generating content for text: {e}")
            return jsonify(message='Error generating improved text!'), 500

    

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
    """Check spelling of the word in the uploaded image."""
    global correct_answers
    global total_questions
    try:
        user_image_file = genai.upload_file(path=img_path)
        
        prompt = f"What is the word written in the image? Give me only the word."
        response = model.generate_content([user_image_file, prompt])
        
        result = response.text.strip()
        print(f"Gemini API response: {result}")

        total_questions += 1

        if result.lower() == word.lower():
            correct_answers += 1
            return 'Correct'
        return 'Incorrect'
        
    except Exception as e:
        print(f"An error occurred while checking spelling: {e}")
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
    
if __name__ == '__main__':
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    with app.app_context():
        db.create_all()
    app.run(debug=True)
