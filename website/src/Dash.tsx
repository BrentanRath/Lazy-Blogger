import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './App.css'

interface User {
  id: string;
  name: string;
  email: string;
  team: string;
}

function Dashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const API_BASE = 'https://testblogapi.notafemboy.org/api'

  // Check authentication on component mount
  useEffect(() => {
    console.log('=== DASHBOARD COMPONENT MOUNTED ===');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    // First, check if there's a token in the URL (from OAuth callback)
    const authStatus = searchParams.get('auth');
    const urlToken = searchParams.get('token');
    
    if (authStatus === 'success' && urlToken) {
      console.log('DASHBOARD: Found token in URL, storing and verifying...');
      // Store token in localStorage
      localStorage.setItem('auth_token', urlToken);
      
      // Clean the URL
      window.history.replaceState({}, document.title, '/dashboard');
      
      // Verify the token
      checkAuthStatus();
    } else {
      console.log('DASHBOARD: No URL token, checking localStorage...');
      // Check for existing token in localStorage
      checkAuthStatus();
    }
  }, [searchParams]);

  const checkAuthStatus = async () => {
    console.log('=== DASHBOARD: checkAuthStatus called ===');
    
    const token = localStorage.getItem('auth_token');
    console.log('Token from localStorage:', token ? token.substring(0, 50) + '...' : 'None');
    
    if (!token) {
      console.log('DASHBOARD: No token found, redirecting to login');
      navigate('/login');
      return;
    }

    try {
      console.log('DASHBOARD: Verifying token with API...');
      
      const response = await fetch('https://testblogapi.notafemboy.org/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('DASHBOARD: Auth response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('DASHBOARD: Auth response data:', data);
        
        if (data.authenticated) {
          console.log('DASHBOARD: User authenticated, setting user data');
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          console.log('DASHBOARD: User not authenticated, redirecting to login');
          localStorage.removeItem('auth_token');
          navigate('/login');
        }
      } else {
        console.log('DASHBOARD: Auth verification failed, redirecting to login');
        localStorage.removeItem('auth_token');
        navigate('/login');
      }
    } catch (error) {
      console.error('DASHBOARD: Auth check failed:', error);
      localStorage.removeItem('auth_token');
      navigate('/login');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch('https://testblogapi.notafemboy.org/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
      localStorage.removeItem('auth_token');
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.removeItem('auth_token');
      navigate('/login');
    }
  };

  const makeApiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        navigate('/login');
        return;
      }

      return response;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setError(null);
      setTranscription('');
      setCorrectedText('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media recording not supported in this browser');
      }

      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Note: This is a simplified example. You'll need to implement actual recording logic
      // using something like MediaRecorder API and then send the audio to your API
      
      setTimeout(() => {
        setIsRecording(false);
        setTranscription('Sample transcription text...');
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const correctText = async () => {
    if (!transcription.trim()) {
      setError('No text to correct');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const response = await makeApiCall('/correct-text', {
        method: 'POST',
        body: JSON.stringify({ text: transcription })
      });

      if (!response) return; // makeApiCall handles auth failures

      if (response.ok) {
        const data = await response.json();
        setCorrectedText(data.correctedText);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to correct text');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to correct text');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Loading...</h2>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Authentication Required</h2>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header style={{ 
        padding: '20px', 
        borderBottom: '1px solid #ccc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1>Welcome to Dashboard</h1>
          {user && (
            <p>Hello, {user.name} from {user.team}</p>
          )}
        </div>
        <button 
          onClick={handleLogout}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </header>

      <main style={{ padding: '20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2>Voice to Blog Post</h2>
          
          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <h3>Step 1: Record Your Voice</h3>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              style={{
                backgroundColor: isRecording ? '#dc3545' : '#28a745',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                fontSize: '16px',
                borderRadius: '4px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.6 : 1
              }}
            >
              {isRecording ? '🔴 Stop Recording' : '🎤 Start Recording'}
            </button>
            {isRecording && (
              <p style={{ color: '#dc3545', marginTop: '10px' }}>
                Recording in progress...
              </p>
            )}
          </div>

          {transcription && (
            <div style={{ marginBottom: '20px' }}>
              <h3>Step 2: Transcription</h3>
              <textarea
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                style={{
                  width: '100%',
                  height: '150px',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}
                placeholder="Your transcribed text will appear here..."
              />
              <button
                onClick={correctText}
                disabled={isProcessing || !transcription.trim()}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing || !transcription.trim() ? 0.6 : 1,
                  marginTop: '10px'
                }}
              >
                {isProcessing ? 'Processing...' : 'Correct & Format Text'}
              </button>
            </div>
          )}

          {correctedText && (
            <div style={{ marginBottom: '20px' }}>
              <h3>Step 3: Corrected Text</h3>
              <textarea
                value={correctedText}
                onChange={(e) => setCorrectedText(e.target.value)}
                style={{
                  width: '100%',
                  height: '200px',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}
                placeholder="Corrected and formatted text will appear here..."
              />
              <div style={{ marginTop: '10px' }}>
                <button
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '10px'
                  }}
                >
                  Save as Draft
                </button>
                <button
                  style={{
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Publish Post
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;