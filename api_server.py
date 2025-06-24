from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
import threading
import time
from functions.audio_recorder import start_recording, stop_recording, get_transcription
from functions.correct_grammar import correct_grammar
import asyncio

app = Flask(__name__)
CORS(app)

current_recorder = None
recording_active = False

@app.route('/api/start-recording', methods=['POST'])
def start_recording_endpoint():
    global current_recorder, recording_active
    
    try:
        if recording_active:
            return jsonify({'error': 'Recording already in progress'}), 400
            
        print("Starting recording...")
        current_recorder = start_recording()
        recording_active = True
        
        return jsonify({'status': 'Recording started', 'recording': True})
    except Exception as e:
        print(f"Error starting recording: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stop-recording', methods=['POST'])
def stop_recording_endpoint():
    global current_recorder, recording_active
    
    try:
        if not recording_active or current_recorder is None:
            return jsonify({'error': 'No active recording'}), 400
            
        print("Stopping recording...")
        stop_recording(current_recorder)
        
        transcription = get_transcription(current_recorder)
        print(f"Raw transcription: {transcription}")
        
        recording_active = False
        current_recorder = None
        
        return jsonify({
            'status': 'Recording stopped',
            'recording': False,
            'transcription': transcription
        })
    except Exception as e:
        print(f"Error stopping recording: {e}")
        recording_active = False
        current_recorder = None
        return jsonify({'error': str(e)}), 500

@app.route('/api/correct-grammar', methods=['POST'])
def correct_grammar_endpoint():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
            
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        corrected_text = loop.run_until_complete(correct_grammar(text))
        loop.close()
        
        return jsonify({
            'original': text,
            'corrected': corrected_text
        })
    except Exception as e:
        print(f"Error correcting grammar: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({
        'recording': recording_active,
        'server': 'running'
    })

if __name__ == '__main__':
    print("Starting Flask API server...")
    print("Server will be available at http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
