import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './App.css'

interface User {
  id: string;
  name: string;
  email: string;
  team: string;
  profilePicture?: string;
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

  useEffect(() => {
    console.log('=== DASHBOARD COMPONENT MOUNTED ===');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const authStatus = searchParams.get('auth');
    const urlToken = searchParams.get('token');
    
    if (authStatus === 'success' && urlToken) {
      console.log('DASHBOARD: Found token in URL, storing and verifying...');
      localStorage.setItem('auth_token', urlToken);
      
      window.history.replaceState({}, document.title, '/dashboard');
      
      checkAuthStatus();
    } else {
      console.log('DASHBOARD: No URL token, checking localStorage...');
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
  const toggleMicrophone = async () => {
    if (!isRecording) {
      try {
        setError(null);
        setIsProcessing(true);
        
        const response = await makeApiCall('/start-recording', {
          method: 'POST'
        });
        
        if (!response) return;
        
        if (!response.ok) {
          throw new Error('Failed to start recording');
        }
        
        const data = await response.json();
        setIsRecording(true);
        setIsProcessing(false);
        console.log('Recording started:', data);
      } catch (err) {
        console.error('Error starting recording:', err);
        setError('Could not start recording. Make sure the API server is running.');
        setIsProcessing(false);
      }
    } else {
      try {
        setIsProcessing(true);
        
        const response = await makeApiCall('/stop-recording', {
          method: 'POST'
        });
        
        if (!response) return;
        
        if (!response.ok) {
          throw new Error('Failed to stop recording');
        }
        
        const data = await response.json();
        setIsRecording(false);
        setIsProcessing(false);
        
        if (data.transcription) {
          setTranscription(data.transcription);
          console.log('Transcription received:', data.transcription);
          
          await correctGrammar(data.transcription);
        } else {
          setTranscription('No transcription available');
        }
        
        console.log('Recording stopped:', data);
      } catch (err) {
        console.error('Error stopping recording:', err);
        setError('Could not stop recording or get transcription.');
        setIsRecording(false);
        setIsProcessing(false);
      }
    }
  };
  const correctGrammar = async (text: string) => {
    try {
      const response = await makeApiCall('/correct-grammar', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      
      if (!response) return;
      
      if (response.ok) {
        const data = await response.json();
        setCorrectedText(data.corrected);
        console.log('Grammar corrected:', data.corrected);
      } else {
        const errorData = await response.json();
        console.error('Grammar correction failed:', errorData);
      }
    } catch (err) {
      console.error('Error correcting grammar:', err);
    }
  };
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user.profilePicture && (
            <img 
              src={user.profilePicture} 
              alt={`${user.name}'s profile`}
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%',
                objectFit: 'cover'
              }} 
            />
          )}
          <p>Hello, {user.name} from {user.team}</p>
        </div>
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
              onClick={toggleMicrophone}
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
              {isProcessing ? 'Processing...' : isRecording ? '🔴 Stop Recording' : '🎤 Start Recording'}
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