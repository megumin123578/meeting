import React, { useState, useEffect } from 'react';
import { useTranslator } from './hooks/useTranslator';
import { useRecorder } from './hooks/useRecorder';
import { useEdgeTTS } from './hooks/useEdgeTTS';
import { useRealtimeTranslator } from './hooks/useRealtimeTranslator';
import { useLiveTranslate } from './hooks/useLiveTranslate';
import { useAuth, type AuthUser } from './hooks/useAuth';
import { AdminPanel } from './components/AdminPanel';
import { RecordingStation } from './components/RecordingStation';
import { TranscriptList } from './components/TranscriptList';
import { LoginPage } from './components/LoginPage';
import { Sparkles, CheckCircle2, AlertTriangle, LogOut, User, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const { token, user, loading, login, register, logout } = useAuth();

  if (loading) {
    return (
      <div className="login-shell">
        <Loader2 size={32} className="animate-spin logo-icon" />
      </div>
    );
  }

  if (!token || !user) {
    return <LoginPage onLogin={login} onRegister={register} />;
  }

  return <AuthedApp token={token} user={user} onLogout={logout} />;
};

interface AuthedAppProps {
  token: string;
  user: AuthUser;
  onLogout: () => void;
}

const AuthedApp: React.FC<AuthedAppProps> = ({ token, user, onLogout }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState('en-US');
  const [targetLang, setTargetLang] = useState('vi-VN');

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 4000);
  };

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
  } = useTranslator({ onShowToast: showToast, token, userId: user.id });

  const {
    loadingCardId,
    playingCardId,
    speakOriginal,
    speakAI,
    stopSpeaking,
  } = useEdgeTTS({ onShowToast: showToast });

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
        try {
          const translated = await translateText(transcribedText, sourceLang, targetLang);
          addTranscriptItem(transcribedText, translated, sourceLang, targetLang);
        } catch (err) {
          console.warn('Failed to translate local transcription, falling back to audio upload...', err);
          translateAudio(base64Audio, mimeType, sourceLang, targetLang);
        }
      } else {
        translateAudio(base64Audio, mimeType, sourceLang, targetLang);
      }
    },
    onError: (msg) => {
      showToast(`❌ Lỗi mic: ${msg}`);
    },
  });

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

  // Live API mode (audio<->audio streaming via Google Live API)
  const isLiveMode = /live/i.test(model);
  const {
    isLive,
    startLive,
    stopLive,
    interimSource,
    interimTarget,
    analyser: liveAnalyser,
  } = useLiveTranslate({
    token,
    sourceLang,
    targetLang,
    model,
    onTurnComplete: addTranscriptItem,
    onShowToast: showToast,
  });

  useEffect(() => {
    if (isRecording) {
      stopSpeaking();
      stopListening();
      stopLive();
    }
  }, [isRecording]);

  useEffect(() => {
    if (isListening) {
      stopSpeaking();
      if (isRecording) stopRecording();
      stopLive();
    }
  }, [isListening]);

  useEffect(() => {
    if (isLive) {
      stopSpeaking();
      if (isRecording) stopRecording();
      stopListening();
    }
  }, [isLive]);

  // If user switches away from a live model while a session is active, end the session
  useEffect(() => {
    if (!isLiveMode && isLive) stopLive();
  }, [isLiveMode, isLive, stopLive]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title-section">
          <Sparkles size={28} className="logo-icon" />
          <div>
            <h1 className="app-title">SpeakLink Dashboard</h1>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="user-chip">
            <User size={12} />
            <strong>{user.username}</strong>
          </span>
          <button className="logout-btn" onClick={onLogout} title="Đăng xuất">
            <LogOut size={12} />
            Đăng xuất
          </button>
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

      <div className="dashboard-grid">
        <div className="sidebar-col">
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

          <RecordingStation
            isRecording={isLiveMode ? isLive : isRecording}
            startRecording={isLiveMode ? () => void startLive() : () => startRecording(sourceLang)}
            stopRecording={isLiveMode ? stopLive : stopRecording}
            cabinMode={cabinMode}
            setCabinMode={setCabinMode}
            cabinInterval={cabinInterval}
            setCabinInterval={setCabinInterval}
            analyser={isLiveMode ? liveAnalyser : analyser}
            isTranslating={isTranslating}
            realtimeMode={realtimeMode}
            setRealtimeMode={setRealtimeMode}
            isListening={isListening}
            startListening={startListening}
            stopListening={stopListening}
            liveMode={isLiveMode}
          />
        </div>

        <div className="content-col">
          <TranscriptList
            transcripts={transcripts}
            onDelete={deleteTranscript}
            onClear={clearTranscripts}
            speakOriginal={speakOriginal}
            speakAI={speakAI}
            playingCardId={playingCardId}
            loadingCardId={loadingCardId}
            interimText={
              isLiveMode
                ? [interimSource, interimTarget].filter(Boolean).join('\n→ ')
                : interimText
            }
            isTranslatingRealtime={isLiveMode ? isLive : isTranslatingRealtime}
            sourceLang={sourceLang}
            setSourceLang={setSourceLang}
            targetLang={targetLang}
            setTargetLang={setTargetLang}
          />
        </div>
      </div>

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
