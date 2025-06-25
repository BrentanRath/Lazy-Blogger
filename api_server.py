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

load_dotenv()

flask_app = Flask(__name__)
flask_app.secret_key = os.getenv('SECRET_KEY')

# Add these session configuration settings
flask_app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
flask_app.config['SESSION_COOKIE_HTTPONLY'] = False  # Change to False to allow JavaScript access
flask_app.config['SESSION_COOKIE_SAMESITE'] = 'None'  # Required for cross-origin
flask_app.config['SESSION_COOKIE_DOMAIN'] = '.notafemboy.org'  # This should work for both subdomains
flask_app.config['SESSION_COOKIE_PATH'] = '/'



# Slack Bolt OAuth setup
oauth_settings = OAuthSettings(
    client_id=os.getenv('SLACK_AUTH_CLIENT_ID'),
    client_secret=os.getenv('SLACK_AUTH_CLIENT_SECRET'),
    scopes=["identity.basic", "identity.email", "identity.team"],
    installation_store=FileInstallationStore(base_dir="./data/installations"),
    state_store=FileOAuthStateStore(expiration_seconds=600, base_dir="./data/states"),
)

# Initialize Slack app with OAuth
slack_app = App(
    signing_secret=os.getenv('SLACK_AUTH_SIGNING_SECRET'),
    oauth_settings=oauth_settings,
    process_before_response=True
)

# OAuth flow instance
oauth_flow = OAuthFlow(settings=oauth_settings)

@flask_app.route('/auth/slack/login')
def slack_login():
    # Generate state for security
    state = secrets.token_urlsafe(32)
    
    # Store state in the OAuth flow's state store
    oauth_flow.settings.state_store.issue(state)
    
    # Generate authorization URL manually
    authorize_url_generator = AuthorizeUrlGenerator(
        client_id=os.getenv('SLACK_AUTH_CLIENT_ID'),
        user_scopes=["identity.basic", "identity.email", "identity.team"],
    )
    
    authorization_url = authorize_url_generator.generate(
        state=state
    )
    
    return redirect(authorization_url)
@flask_app.route('/auth/slack/callback')
def slack_callback():
    # Handle OAuth callback using the built-in flow
    if 'error' in request.args:
        return redirect('http://blog.notafemboy.org/login?auth=error')
    
    code = request.args.get('code')
    state = request.args.get('state')
    
    if not code:
        return redirect('http://blog.notafemboy.org/login?auth=error')
    
    try:
        # Use the OAuth flow which handles state verification internally
        oauth_response = oauth_flow.run_installation(code)
        
        if oauth_response is None:
            return jsonify({'error': 'OAuth flow failed'}), 400
        
        # Get user identity
        from slack_sdk import WebClient
        client = WebClient(token=oauth_response.user_token)
        
        # Get user identity information
        identity_response = client.users_identity()
        
        if not identity_response['ok']:
            return jsonify({'error': 'Failed to get user identity'}), 400
        
        user_info = identity_response['user']
        team_info = identity_response['team']
        
        # Store user session
        session['slack_user_token'] = oauth_response.user_token
        session['user_id'] = user_info['id']
        session['user_name'] = user_info['name']
        session['user_email'] = user_info.get('email', '')
        session['team_id'] = team_info['id']
        session['team_name'] = team_info['name']
        session['authenticated'] = True
        
        print("OAuth Response:", oauth_response)
        print("User Info:", user_info)
        print("Team Info:", team_info)
        
        # Redirect to frontend
        return redirect('http://blog.notafemboy.org/dashboard?auth=success')
        
    except Exception as e:
        print(f"OAuth error: {e}")
        return redirect('http://blog.notafemboy.org/login?auth=error')
    


@flask_app.route('/auth/verify')
def verify_auth():
    print(f"Session data: {dict(session)}")  # Debug line
    print(f"Session ID: {session.sid if hasattr(session, 'sid') else 'No SID'}")  # Debug line
    print(f"Cookies received: {request.cookies}")  # Debug line
    
    if session.get('authenticated'):
        return jsonify({
            'authenticated': True,
            'user': {
                'id': session.get('user_id'),
                'name': session.get('user_name'),
                'email': session.get('user_email'),
                'team': session.get('team_name')
            }
        })
    return jsonify({'authenticated': False}), 401


@flask_app.route('/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})





def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@flask_app.route('/api/protected-endpoint')
@require_auth
def protected_endpoint():
    return jsonify({
        'message': 'This is a protected endpoint',
        'user': session.get('user_name')
    })



# CORS support
@flask_app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'message': 'OK'})
        response.headers.add("Access-Control-Allow-Origin", request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization")
        response.headers.add('Access-Control-Allow-Methods', "GET,PUT,POST,DELETE,OPTIONS")
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response


@flask_app.after_request
def after_request(response):
    # Update to include the correct frontend domain
    allowed_origins = [
        'http://blog.notafemboy.org',
        'http://blog.notafemboy.org:3000',
        'http://blog.notafemboy.org:5173',
        'http://localhost:3000',
        'http://localhost:5173'
    ]
    origin = request.headers.get('Origin')
    
    # Always add CORS headers for allowed origins
    if origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Credentials', 'true')
    
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Max-Age', '86400')
    return response

os.makedirs('./data/installations', exist_ok=True)
os.makedirs('./data/states', exist_ok=True)

if __name__ == '__main__':
    flask_app.run(debug=True, port=5000)