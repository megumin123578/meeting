import React, { useState, useEffect } from 'react';
import { useTranslator } from './hooks/useTranslator';
import { useRecorder } from './hooks/useRecorder';
import { useEdgeTTS } from './hooks/useEdgeTTS';
import { useRealtimeTranslator } from './hooks/useRealtimeTranslator';
import { AdminPanel } from './components/AdminPanel';
import { LanguageSelector } from './components/LanguageSelector';
import { RecordingStation } from './components/RecordingStation';
import { TranscriptList } from './components/TranscriptList';
import { Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState('en-US');
  const [targetLang, setTargetLang] = useState('vi-VN');

  // Trigger transient notifications
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 4000);
  };

  // 1. Initialise Translator Hooks (Keys, diagnostics, histories)
  const {
    apiKey,
    saveApiKey,
    isKeyValid,
    keyError,
    checkApiKey,
    ttsStatus,
    checkEdgeTTS,
    isTranslating,
    transcripts,
    translateAudio,
    deleteTranscript,
    clearTranscripts,
    translateText,
    addTranscriptItem,
    model,
    saveModel,
  } = useTranslator({ onShowToast: showToast });

  // 2. Initialise Audio Player Hooks (Edge TTS Subprocess + WebSpeech API Fallbacks)
  const {
    loadingCardId,
    playingCardId,
    speakOriginal,
    speakAI,
    stopSpeaking,
  } = useEdgeTTS({ onShowToast: showToast });

  // 3. Initialise Recorder Hooks (Push-to-Talk, Toggles, Cabin slices)
  const {
    isRecording,
    startRecording,
    stopRecording,
    cabinMode,
    setCabinMode,
    cabinInterval,
    setCabinInterval,
    analyser,
  } = useRecorder({
    onAudioReady: async (base64Audio, mimeType, transcribedText) => {
      if (transcribedText) {
        // If browser SpeechRecognition successfully transcribed locally, translate directly for free!
        try {
          const translated = await translateText(transcribedText, sourceLang, targetLang);
          addTranscriptItem(transcribedText, translated, sourceLang, targetLang);
        } catch (err) {
          console.warn('Failed to translate local transcription, falling back to audio upload...', err);
          translateAudio(base64Audio, mimeType, sourceLang, targetLang);
        }
      } else {
        // Fallback for uploaded files or unsupported speech-recognition browsers
        translateAudio(base64Audio, mimeType, sourceLang, targetLang);
      }
    },
    onError: (msg) => {
      showToast(`❌ Lỗi mic: ${msg}`);
    },
  });

  // 4. Initialise Real-time Translator Hooks (Speech Recognition + API translation)
  const {
    realtimeMode,
    setRealtimeMode,
    isListening,
    startListening,
    stopListening,
    interimText,
    isTranslatingRealtime,
  } = useRealtimeTranslator({
    sourceLang,
    targetLang,
    translateText,
    addTranscriptItem,
    onShowToast: showToast,
  });

  // Stop any reading playback or real-time listening if standard recording starts
  useEffect(() => {
    if (isRecording) {
      stopSpeaking();
      stopListening();
    }
  }, [isRecording]);

  // Stop standard recording or reading playback if real-time listening starts
  useEffect(() => {
    if (isListening) {
      stopSpeaking();
      if (isRecording) {
        stopRecording();
      }
    }
  }, [isListening]);

  return (
    <div className="app-container">
      {/* Premium Design Header */}
      <header className="app-header">
        <div className="app-title-section">
          <Sparkles size={28} className="logo-icon" />
          <div>
            <h1 className="app-title">SpeakLink Dashboard</h1>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            title="Đường truyền hoàn toàn bảo mật từ máy của bạn"
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success)',
              boxShadow: '0 0 8px var(--color-success)',
            }}
          ></div>
        </div>
      </header>

      {/* Grid Layout (Collapsible Settings & Record Side vs Transcript side) */}
      <div className="dashboard-grid">
        {/* Left Column (Inputs, Configurations, Mic Status) */}
        <div className="sidebar-col">
          {/* Admin API Configuration Panel */}
          <AdminPanel
            apiKey={apiKey}
            onSaveKey={saveApiKey}
            isKeyValid={isKeyValid}
            keyError={keyError}
            onCheckKey={checkApiKey}
            ttsStatus={ttsStatus}
            onCheckTTS={checkEdgeTTS}
            model={model}
            onSaveModel={saveModel}
          />

          {/* Languages Configuration Dropdowns */}
          <LanguageSelector
            sourceLang={sourceLang}
            setSourceLang={setSourceLang}
            targetLang={targetLang}
            setTargetLang={setTargetLang}
          />

          {/* Audio Capturing Controls Station */}
          <RecordingStation
            isRecording={isRecording}
            startRecording={() => startRecording(sourceLang)}
            stopRecording={stopRecording}
            cabinMode={cabinMode}
            setCabinMode={setCabinMode}
            cabinInterval={cabinInterval}
            setCabinInterval={setCabinInterval}
            analyser={analyser}
            isTranslating={isTranslating}
            realtimeMode={realtimeMode}
            setRealtimeMode={setRealtimeMode}
            isListening={isListening}
            startListening={startListening}
            stopListening={stopListening}
          />
        </div>

        {/* Right Column (Scrollable Conversation History) */}
        <div className="content-col">
          <TranscriptList
            transcripts={transcripts}
            onDelete={deleteTranscript}
            onClear={clearTranscripts}
            speakOriginal={speakOriginal}
            speakAI={speakAI}
            playingCardId={playingCardId}
            loadingCardId={loadingCardId}
            interimText={interimText}
            isTranslatingRealtime={isTranslatingRealtime}
          />
        </div>
      </div>

      {/* Toast Alert Popups */}
      {toastMessage && (
        <div className="toast">
          {toastMessage.includes('❌') || toastMessage.includes('Lỗi') ? (
            <AlertTriangle size={16} style={{ color: 'var(--color-error)' }} />
          ) : (
            <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
          )}
          <span style={{ fontSize: '0.85rem' }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
