const { useState, useRef, useEffect } = React;

// TypeScript-style interfaces (using JSDoc for type hints)
/**
 * @typedef {Object} AppState
 * @property {boolean} hasPermission
 * @property {boolean} isRecording
 * @property {Blob|null} recordedBlob
 * @property {string} transcript
 * @property {boolean} isTranscribing
 * @property {string|null} error
 * @property {number} recordingTime
 * @property {string} apiKey
 */

/**
 * @typedef {Object} ElevenLabsResponse
 * @property {string} text
 */

// ElevenLabs API service
class ElevenLabsService {
  static ENDPOINT = 'https://api.elevenlabs.io/v1/speech-to-text';
  static MODEL = 'scribe_v1';

  /**
   * Transcribe audio using ElevenLabs API
   * @param {Blob} audioBlob - The audio blob to transcribe
   * @param {string} apiKey - ElevenLabs API key
   * @returns {Promise<string>} The transcribed text
   */
  static async transcribeAudio(audioBlob, apiKey) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model_id', this.MODEL);
    formData.append('tag_audio_events', false);
    formData.append('language_code', "eng");
    formData.append('diarize', false);

    const response = await fetch(this.ENDPOINT, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Error (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    return data.text || '';
  }
}

// Utility functions
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Main App Component
function App() {
  // State management
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const apiKey = process.env.ELEVENLABS_API_KEY || "";

  // Clear error when starting new actions
  const clearError = () => setError(null);

  // Check if browser supports required APIs
  const checkBrowserSupport = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Safari.');
    }
    if (!window.MediaRecorder) {
      throw new Error('Your browser does not support MediaRecorder API. Please update your browser.');
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      clearError();
      setIsRequestingPermission(true);
      
      // Check browser support first
      checkBrowserSupport();
      
      // Clean up any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Request new stream with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      setHasPermission(true);
      
      // Test that we can create a MediaRecorder with this stream
      const testRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm'
          : 'audio/wav'
      });
      testRecorder.stop(); // Clean up test recorder
      
    } catch (err) {
      console.error('Microphone access error:', err);
      let errorMessage = 'Failed to access microphone. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please click the microphone icon in your browser\'s address bar and allow access, then try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No microphone found.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Microphone is being used by another application. Please close other apps and try again.';
      } else {
        errorMessage += 'Please check your browser settings.';
      }
      
      setError(errorMessage);
      setHasPermission(false);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Start recording
  const startRecording = () => {
    if (!streamRef.current) {
      setError('No microphone stream available. Please request permission again.');
      return;
    }

    try {
      clearError();
      chunksRef.current = [];
      setRecordingTime(0);
      
      // Determine the best supported mime type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/wav';
        }
      }

      mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
        mimeType: mimeType
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        setError('Recording error occurred. Please try again.');
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      // Start recording with 100ms intervals for smooth data collection
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordedBlob(null);
      setTranscript('');

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      setError('Failed to start recording. Please try refreshing the page and requesting permission again.');
      console.error('Error starting recording:', err);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Transcribe audio
  const transcribeAudio = async () => {
    if (!recordedBlob) {
      setError('No audio recorded. Please record audio first.');
      return;
    }

    try {
      clearError();
      setIsTranscribing(true);
      setTranscript('');
      
      const transcriptionText = await ElevenLabsService.transcribeAudio(recordedBlob, apiKey.trim());
      setTranscript(transcriptionText || 'No speech detected in the audio.');
    } catch (err) {
      setError(err.message || 'Failed to transcribe audio.');
      console.error('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return React.createElement('div', { className: 'app' },
    // Header
    React.createElement('div', { className: 'header' },
      React.createElement('h1', null, 'Voice to Text with ElevenLabs'),
      React.createElement('p', null, 'Record audio and get transcription using ElevenLabs Speech-to-Text API')
    ),

    // Error display
    error && React.createElement('div', { className: 'error-message' }, error),

    // Recording Section
    React.createElement('div', { className: 'recording-section' },
      React.createElement('h2', null, 'Audio Recording'),
      
      React.createElement('div', { className: 'controls' },
        // Permission buttons
        !hasPermission && React.createElement('div', { className: 'button-group' },
          React.createElement('button', {
            onClick: requestMicrophonePermission,
            disabled: isRequestingPermission,
            className: 'btn btn--primary'
          }, 
            isRequestingPermission && React.createElement('span', { className: 'loading-spinner' }),
            isRequestingPermission ? 'Requesting Permission...' : 'Get Microphone Permission'
          )
        ),

        // Permission granted message
        hasPermission && !isRecording && !recordedBlob && React.createElement('div', { className: 'success-message' },
          '✓ Microphone access granted! You can now start recording.'
        ),

        // Recording controls
        hasPermission && React.createElement('div', { className: 'button-group' },
          React.createElement('button', {
            onClick: startRecording,
            disabled: isRecording,
            className: 'btn btn--primary'
          }, 'Start Recording'),
          
          React.createElement('button', {
            onClick: stopRecording,
            disabled: !isRecording,
            className: 'btn btn--secondary'
          }, 'Stop Recording')
        ),

        // Recording status
        isRecording && React.createElement('div', { className: 'recording-status' },
          React.createElement('div', { className: 'recording-indicator' }),
          React.createElement('span', { className: 'timer' }, formatTime(recordingTime))
        ),

        // Audio recorded status
        recordedBlob && !isRecording && React.createElement('div', { className: 'success-message' },
          `✓ Audio recorded successfully! Duration: ${formatTime(recordingTime)} ${''}`
        ),

        // Transcribe button
        recordedBlob && React.createElement('button', {
          onClick: transcribeAudio,
          disabled: isTranscribing || !apiKey.trim(),
          className: 'btn btn--primary'
        }, 
          isTranscribing && React.createElement('span', { className: 'loading-spinner' }),
          isTranscribing ? 'Transcribing...' : 'Transcribe Audio'
        )
      )
    ),

    // Transcript Section
    React.createElement('div', { className: 'transcript-section' },
      React.createElement('h2', null, 'Transcript'),
      React.createElement('textarea', {
        value: transcript,
        onChange: (e) => setTranscript(e.target.value),
        placeholder: 'Your transcription will appear here...',
        className: 'transcript-area',
        readOnly: false
      }),
      transcript && React.createElement('div', { 
        style: { 
          marginTop: 'var(--space-12)', 
          fontSize: 'var(--font-size-sm)', 
          color: 'var(--color-text-secondary)' 
        } 
      }, `Character count: ${transcript.length}`)
    )
  );
}

// Render the app
ReactDOM.render(React.createElement(App), document.getElementById('root'));