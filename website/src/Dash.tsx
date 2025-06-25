import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  
  const API_BASE = 'https://testblogapi.notafemboy.org/api'

  // Check authentication on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://testblogapi.notafemboy.org/auth/verify', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate('/login');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://testblogapi.notafemboy.org/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getCurrentDate = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}-${day}-${year}`;
  };

  const toggleMicrophone = async () => {
    if (!isRecording) {
      try {
        setError(null);
        setIsProcessing(true);
        
        const response = await fetch(`${API_BASE}/start-recording`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include credentials for auth
        });
        
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
        
        const response = await fetch(`${API_BASE}/stop-recording`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include credentials for auth
        });
        
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
      const response = await fetch(`${API_BASE}/correct-grammar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        credentials: 'include', // Include credentials for auth
      });
      
      if (response.ok) {
        const data = await response.json();
        setCorrectedText(data.corrected);
        console.log('Grammar corrected:', data.corrected);
      }
    } catch (err) {
      console.error('Error correcting grammar:', err);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        textAlign: 'center'
      }}>
        <h2>Please log in to access the dashboard</h2>
        <button 
          onClick={() => navigate('/login')}
          style={{
            backgroundColor: '#4A154B',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            fontSize: '16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header with user info and logout */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', color: '#333' }}>Dashboard</h2>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
            Welcome, <strong>{user?.name}</strong> from <em>{user?.team}</em>
          </p>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
        >
          Logout
        </button>
      </div>

      {/* Main content */}
      <h1>Realtime Speech-to-Text</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="microphone-container">
        <button 
          className={`microphone-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
          onClick={toggleMicrophone}
          disabled={isProcessing}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <div className="microphone-icon">
            <span className="mic-body"></span>
            <span className="mic-base"></span>
            {isRecording && <span className="mic-animation"></span>}
          </div>
          {isProcessing ? 'Processing...' : (isRecording ? 'Stop Recording' : 'Start Recording')}
        </button>
      </div>

      {transcription && (
        <div className="transcription-container">
          <h2>Raw Transcription:</h2>
          <p className="transcription-text">{transcription}</p>
          
          {correctedText && (
            <div className="corrected-text-container">
              <h3>Grammar Corrected:</h3>
              <p className="corrected-text">{correctedText}</p>
            </div>
          )}

          {correctedText && (
            <div className="blog-entry-container">
              <h3>Formatted Blog Entry:</h3>
              <div className="blog-entry">
                <div className="blog-content">
                  Day 00 Entry 00 ({getCurrentDate()})
                  <br></br>
                  <br></br>
                  {correctedText}
                  <br></br>
                  <br></br>
                  End Entry 00.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Dashboard