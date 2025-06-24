import { useState } from 'react'
import './App.css'

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const API_BASE = 'https://testblogapi.notafemboy.org/api'

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

  return (
    <div className="app-container">
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
        </div>
      )}
    </div>
  )
}

export default App
