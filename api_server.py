from flask import Flask, request, redirect, session, jsonify, url_for
from slack_bolt import App
from slack_bolt.oauth.oauth_settings import OAuthSettings
from slack_bolt.oauth.oauth_flow import OAuthFlow
from slack_sdk.oauth import AuthorizeUrlGenerator
from slack_sdk.oauth.installation_store import FileInstallationStore
from slack_sdk.oauth.state_store import FileOAuthStateStore
import os
from dotenv import load_dotenv
import secrets
from functools import wraps
import jwt
from datetime import datetime, timedelta

from functions.audio_recorder import start_recording, stop_recording, get_transcription
from functions.correct_grammar import correct_grammar
load_dotenv()

flask_app = Flask(__name__)
flask_app.secret_key = os.getenv('SECRET_KEY')

flask_app.config['SESSION_COOKIE_SECURE'] = False  # MAKE TRU IN PROD
flask_app.config['SESSION_COOKIE_HTTPONLY'] = False  
flask_app.config['SESSION_COOKIE_SAMESITE'] = 'None'  
flask_app.config['SESSION_COOKIE_DOMAIN'] = '.notafemboy.org'  
flask_app.config['SESSION_COOKIE_PATH'] = '/'



oauth_settings = OAuthSettings(
    client_id=os.getenv('SLACK_AUTH_CLIENT_ID'),
    client_secret=os.getenv('SLACK_AUTH_CLIENT_SECRET'),
    scopes=["identity.basic", "identity.email", "identity.team", "identity.avatar"],
    installation_store=FileInstallationStore(base_dir="./data/installations"),
    state_store=FileOAuthStateStore(expiration_seconds=600, base_dir="./data/states"),
)

slack_app = App(
    signing_secret=os.getenv('SLACK_AUTH_SIGNING_SECRET'),
    oauth_settings=oauth_settings,
    process_before_response=True
)

oauth_flow = OAuthFlow(settings=oauth_settings)

@flask_app.route('/auth/slack/login')
def slack_login():
    state = secrets.token_urlsafe(32)
    
    oauth_flow.settings.state_store.issue(state)
    
    authorize_url_generator = AuthorizeUrlGenerator(
        client_id=os.getenv('SLACK_AUTH_CLIENT_ID'),
        user_scopes=["identity.basic", "identity.email", "identity.team", "identity.avatar"],
    )
    
    authorization_url = authorize_url_generator.generate(
        state=state
    )
    
    return redirect(authorization_url)





current_recorder = None
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        token = auth_header.split(' ')[1]
        user_data = verify_auth_token(token)
        if not user_data:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        request.user_data = user_data
        return f(*args, **kwargs)
    return decorated_function

@flask_app.route('/api/start-recording', methods=['POST'])
@require_auth
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
@require_auth
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
@require_auth
def api_correct_grammar():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400
        
        text = data['text']
        corrected = correct_grammar(text)
        
        return jsonify({
            'original': text,
            'corrected': corrected
        })
    except Exception as e:
        return jsonify({'error': f'Failed to correct grammar: {str(e)}'}), 500







# TOKEN CRAP-----------
def generate_auth_token(user_info, team_info):
    payload = {
        'user_id': user_info['id'],
        'user_name': user_info['name'],
        'user_email': user_info.get('email', ''),
        'team_id': team_info['id'],
        'team_name': team_info['name'],
        'profile_picture': user_info.get('image_512') or user_info.get('image_192') or user_info.get('image_72') or user_info.get('image_48') or user_info.get('image_24'),
        'exp': datetime.utcnow() + timedelta(days=7)  # WHEN TOKEN EXPIRE, RN IT IS 7 DAYS, WILL CHANGE IN PROD
    }
    return jwt.encode(payload, flask_app.secret_key, algorithm='HS256')

def verify_auth_token(token):
    try:
        print(f"Attempting to decode token: {token[:50]}...")
        payload = jwt.decode(token, flask_app.secret_key, algorithms=['HS256'])
        print(f"Token decoded successfully: {payload}")
        return payload
    except jwt.ExpiredSignatureError as e:
        print(f"Token expired: {e}")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid token: {e}")
        return None
    except Exception as e:
        print(f"Token verification error: {e}")
        return None
    

@flask_app.route('/auth/slack/callback')
def slack_callback():
    if 'error' in request.args:
        return redirect('https://blog.notafemboy.org/login?auth=error')
    
    code = request.args.get('code')
    state = request.args.get('state')
    
    if not code:
        return redirect('https://blog.notafemboy.org/login?auth=error')
    
    try:
        oauth_response = oauth_flow.run_installation(code)
        
        if oauth_response is None:
            return jsonify({'error': 'OAuth flow failed'}), 400
        
        from slack_sdk import WebClient
        client = WebClient(token=oauth_response.user_token)
        
        identity_response = client.users_identity()
        
        if not identity_response['ok']:
            return jsonify({'error': 'Failed to get user identity'}), 400
        
        user_info = identity_response['user']
        team_info = identity_response['team']
        
        auth_token = generate_auth_token(user_info, team_info)
        
        print("OAuth Response:", oauth_response)
        print("User Info:", user_info)
        print("Team Info:", team_info)
        
        return redirect(f'https://blog.notafemboy.org/dashboard?auth=success&token={auth_token}')
        
    except Exception as e:
        print(f"OAuth error: {e}")
        return redirect('https://blog.notafemboy.org/login?auth=error')



@flask_app.route('/auth/verify')
def verify_auth():
    print(f"=== AUTH VERIFY DEBUG ===")
    print(f"Request headers: {dict(request.headers)}")
    print(f"Request args: {dict(request.args)}")
    
    auth_header = request.headers.get('Authorization')
    token = None
    
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        print(f"Token from header: {token[:50]}...")
    else:
        token = request.args.get('token')
        print(f"Token from args: {token[:50] if token else 'None'}...")
    
    if not token:
        print("No token found!")
        return jsonify({'authenticated': False, 'error': 'No token provided'}), 401
    
    user_data = verify_auth_token(token)
    print(f"Token verification result: {user_data}")
    
    if user_data:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': user_data['user_id'],
                'name': user_data['user_name'],
                'email': user_data['user_email'],
                'team': user_data['team_name'],
                'profilePicture': user_data.get('profile_picture')
            }
        })
    
    print("Token verification failed!")
    return jsonify({'authenticated': False, 'error': 'Invalid token'}), 401




@flask_app.route('/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})



@flask_app.route('/api/protected-endpoint')
@require_auth
def protected_endpoint():
    return jsonify({
        'message': 'This is a protected endpoint',
        'user': session.get('user_name')
    })



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
os.makedirs('./data/installations', exist_ok=True)
os.makedirs('./data/states', exist_ok=True)

if __name__ == '__main__':
    flask_app.run(debug=True, port=5000)