from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv

from functions.audio_recorder import start_recording, stop_recording, get_transcription
from functions.correct_grammar import correct_grammar

load_dotenv()

flask_app = Flask(__name__)
flask_app.secret_key = os.getenv('SECRET_KEY', 'default-secret-key')

# CORS configuration
flask_app.config['SESSION_COOKIE_SECURE'] = False  # MAKE TRUE IN PROD
flask_app.config['SESSION_COOKIE_HTTPONLY'] = False  
flask_app.config['SESSION_COOKIE_SAMESITE'] = 'None'  
flask_app.config['SESSION_COOKIE_DOMAIN'] = '.notafemboy.org'  
flask_app.config['SESSION_COOKIE_PATH'] = '/'

# Global variable to track current recording
current_recorder = None

@flask_app.route('/api/start-recording', methods=['POST'])
def api_start_recording():
    global current_recorder
    try:
        if current_recorder is not None:
            return jsonify({'error': 'Recording already in progress'}), 400
        
        current_recorder = start_recording()
        return jsonify({'message': 'Recording started', 'status': 'recording'})
    except Exception as e:
        return jsonify({'error': f'Failed to start recording: {str(e)}'}), 500

@flask_app.route('/api/stop-recording', methods=['POST'])
def api_stop_recording():
    global current_recorder
    try:
        if current_recorder is None:
            return jsonify({'error': 'No recording in progress'}), 400
        
        transcription = get_transcription(current_recorder)
        stop_recording(current_recorder)
        current_recorder = None
        
        return jsonify({
            'message': 'Recording stopped',
            'transcription': transcription,
            'status': 'stopped'
        })
    except Exception as e:
        current_recorder = None
        return jsonify({'error': f'Failed to stop recording: {str(e)}'}), 500

@flask_app.route('/api/correct-grammar', methods=['POST'])
def api_correct_grammar():
    import asyncio
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400
        
        text = data['text']
        prompt_type = data.get('prompt_type', 'blog')  # Default to 'blog' if not specified
        
        # Run the async function in an event loop
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        corrected = loop.run_until_complete(correct_grammar(text, prompt_type))
        
        return jsonify({
            'original': text,
            'corrected': corrected,
            'prompt_type': prompt_type
        })
    except Exception as e:
        return jsonify({'error': f'Failed to correct grammar: {str(e)}'}), 500

@flask_app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'API is running'})

@flask_app.route('/api/prompt-types', methods=['GET'])
def get_prompt_types():
    from functions.send_prompt_to_api import PROMPT_CONTEXTS
    prompt_types = {
        "blog": "Blog Writing",
        "project_logging": "Project Logging", 
        "meeting_notes": "Meeting Notes",
        "creative_writing": "Creative Writing",
        "technical_docs": "Technical Documentation"
    }
    return jsonify({'prompt_types': prompt_types})

@flask_app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'message': 'OK'})
        
        allowed_origins = [
            'https://blog.notafemboy.org',
            'http://blog.notafemboy.org',
            'http://blog.notafemboy.org:3000',
            'http://blog.notafemboy.org:5173',
            'https://blog.notafemboy.org:3000',
            'https://blog.notafemboy.org:5173',
            'http://localhost:3000',
            'http://localhost:5173'
        ]
        
        origin = request.headers.get('Origin')
        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
        
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '86400'
        return response

@flask_app.after_request
def after_request(response):
    allowed_origins = [
        'https://blog.notafemboy.org',
        'http://blog.notafemboy.org',
        'http://blog.notafemboy.org:3000',
        'http://blog.notafemboy.org:5173',
        'https://blog.notafemboy.org:3000',
        'https://blog.notafemboy.org:5173',
        'http://localhost:3000',
        'http://localhost:5173'
    ]
    
    origin = request.headers.get('Origin')
    
    if origin in allowed_origins and 'Access-Control-Allow-Origin' not in response.headers:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    
    if 'Access-Control-Allow-Headers' not in response.headers:
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
    if 'Access-Control-Allow-Methods' not in response.headers:
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    if 'Access-Control-Max-Age' not in response.headers:
        response.headers['Access-Control-Max-Age'] = '86400'
    
    return response

if __name__ == '__main__':
    flask_app.run(debug=True, port=5000)