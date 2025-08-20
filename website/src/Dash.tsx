import { useState } from 'react'
import './App.css'

function Dashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPromptType, setSelectedPromptType] = useState<'blog' | 'project_logging' | 'meeting_notes' | 'creative_writing' | 'technical_docs'>('blog');
  const promptTypes = {
    blog: 'Blog Writing',
    project_logging: 'Project Logging',
    meeting_notes: 'Meeting Notes',
    creative_writing: 'Creative Writing',
    technical_docs: 'Technical Documentation'
  };
  
  const API_BASE = 'https://testblogapi.notafemboy.org/api'

  const makeApiCall = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

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
        body: JSON.stringify({ text, prompt_type: selectedPromptType })
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

  const getUIText = () => {
    const uiTexts: Record<typeof selectedPromptType, {
      title: string;
      subtitle: string;
      outputTitle: string;
      outputHeader: string;
    }> = {
      blog: {
        title: 'Voice to Blog',
        subtitle: 'Transform your voice into polished blog posts',
        outputTitle: 'Polished Blog Post',
        outputHeader: 'Generated Blog Post'
      },
      project_logging: {
        title: 'Voice to Project Notes',
        subtitle: 'Transform your voice into professional project documentation',
        outputTitle: 'Project Documentation',
        outputHeader: 'Generated Project Notes'
      },
      meeting_notes: {
        title: 'Voice to Meeting Notes',
        subtitle: 'Transform your voice into organized meeting documentation',
        outputTitle: 'Meeting Documentation',
        outputHeader: 'Generated Meeting Notes'
      },
      creative_writing: {
        title: 'Voice to Creative Writing',
        subtitle: 'Transform your voice into enhanced creative content',
        outputTitle: 'Enhanced Creative Text',
        outputHeader: 'Enhanced Creative Content'
      },
      technical_docs: {
        title: 'Voice to Technical Docs',
        subtitle: 'Transform your voice into clear technical documentation',
        outputTitle: 'Technical Documentation',
        outputHeader: 'Generated Technical Docs'
      }
    };
    return uiTexts[selectedPromptType];
  };

  const currentUIText = getUIText();
  return (
    <div className="app-container">
      <header className="header">
        <h1 className="main-title">{currentUIText.title}</h1>
        <p className="subtitle">{currentUIText.subtitle}</p>
      </header>

      <main className="main-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="prompt-selection-section">
          <h2>Choose Content Type</h2>
          <div className="prompt-types-container">
            {Object.entries(promptTypes).map(([key, label]) => (
              <label key={key} className="prompt-type-option">
                <input
                  type="radio"
                  name="promptType"
                  value={key}
                  checked={selectedPromptType === key}
                  onChange={(e) => setSelectedPromptType(e.target.value as typeof selectedPromptType)}
                />
                <span className="prompt-type-label">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="recording-section">
          <h2>Record Your Voice</h2>
          <div className="microphone-container">
            <button
              className={`microphone-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={toggleMicrophone}
              disabled={isProcessing}
            >
              <div className="microphone-icon">
                <div className="mic-body"></div>
                <div className="mic-base"></div>
                {isRecording && <div className="mic-animation"></div>}
              </div>
              <span className="button-text">
                {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}
              </span>
            </button>
          </div>
          {isRecording && (
            <p className="recording-status">
              🔴 Recording in progress...
            </p>
          )}
        </div>

        {transcription && (
          <div className="transcription-container">
            <h2>Transcription</h2>
            <textarea
              className="transcription-textarea"
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              placeholder="Your transcribed text will appear here..."
            />
          </div>
        )}

        {correctedText && (
          <div className="blog-entry-container">
            <h2>{currentUIText.outputTitle}</h2>
            <div className="blog-entry">
              <div className="blog-header">{currentUIText.outputHeader}</div>
              <div className="blog-content">{correctedText}</div>
              <div className="blog-footer">Ready to use!</div>
            </div>
            <div className="action-buttons">
              <button className="btn btn-primary">
                Save as Draft
              </button>
              <button className="btn btn-secondary">
                Export Content
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;