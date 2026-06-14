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
import { CheckCircle2, AlertTriangle, LogOut, User, Loader2, Settings as SettingsIcon, X } from 'lucide-react';

export type RecordingMode = 'normal' | 'cabin' | 'realtime' | 'live';
export type InputStyle = 'toggle' | 'ptt';

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
  const [mode, setMode] = useState<RecordingMode>('normal');
  const [inputStyle, setInputStyle] = useState<InputStyle>(() => {
    const stored = localStorage.getItem('input_style');
    return stored === 'ptt' ? 'ptt' : 'toggle';
  });
  const [pttKey, setPttKey] = useState<string>(
    () => localStorage.getItem('ptt_key') || 'Space'
  );
  const [showSettings, setShowSettings] = useState(false);

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
  const isLiveModelSelected = /live/i.test(model);
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

  // Lock mode to 'live' when a live model is selected; restore otherwise.
  useEffect(() => {
    if (isLiveModelSelected && mode !== 'live') setMode('live');
    else if (!isLiveModelSelected && mode === 'live') setMode('normal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiveModelSelected]);

  // Persist input style + ptt key preferences
  useEffect(() => {
    localStorage.setItem('input_style', inputStyle);
  }, [inputStyle]);

  useEffect(() => {
    localStorage.setItem('ptt_key', pttKey);
  }, [pttKey]);

  // Sync the unified mode -> hook-internal flags (cabin / realtime).
  useEffect(() => {
    setCabinMode(mode === 'cabin');
    setRealtimeMode(mode === 'realtime');
  }, [mode, setCabinMode, setRealtimeMode]);

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

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title-section">
          <h1 className="app-title">SpeakLink</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative' }}>
          <span className="user-chip">
            <User size={12} />
            <strong>{user.username}</strong>
          </span>
          <button
            className="topbar-icon-btn"
            onClick={() => setShowSettings((v) => !v)}
            title="Cài đặt"
            aria-expanded={showSettings}
          >
            <SettingsIcon size={16} />
          </button>

          {showSettings && (
            <SettingsPopover
              inputStyle={inputStyle}
              setInputStyle={setInputStyle}
              pttKey={pttKey}
              setPttKey={setPttKey}
              onLogout={onLogout}
              onClose={() => setShowSettings(false)}
            />
          )}
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
          />

          <RecordingStation
            mode={mode}
            setMode={setMode}
            inputStyle={inputStyle}
            pttKey={pttKey}
            isLiveModelSelected={isLiveModelSelected}
            isActive={
              mode === 'live'
                ? isLive
                : mode === 'realtime'
                ? isListening
                : isRecording
            }
            onStart={
              mode === 'live'
                ? () => void startLive()
                : mode === 'realtime'
                ? startListening
                : () => startRecording(sourceLang)
            }
            onStop={
              mode === 'live'
                ? stopLive
                : mode === 'realtime'
                ? stopListening
                : stopRecording
            }
            cabinInterval={cabinInterval}
            setCabinInterval={setCabinInterval}
            analyser={mode === 'live' ? liveAnalyser : analyser}
            isTranslating={isTranslating}
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
            interimSource={mode === 'live' ? interimSource : interimText}
            interimTarget={mode === 'live' ? interimTarget : ''}
            isTranslatingRealtime={mode === 'live' ? isLive : isTranslatingRealtime}
            sourceLang={sourceLang}
            setSourceLang={setSourceLang}
            targetLang={targetLang}
            setTargetLang={setTargetLang}
            model={model}
            onSaveModel={saveModel}
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

interface SettingsPopoverProps {
  inputStyle: InputStyle;
  setInputStyle: (s: InputStyle) => void;
  pttKey: string;
  setPttKey: (k: string) => void;
  onLogout: () => void;
  onClose: () => void;
}

const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  inputStyle,
  setInputStyle,
  pttKey,
  setPttKey,
  onLogout,
  onClose,
}) => {
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.settings-popover') && !target.closest('.topbar-icon-btn')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  // Capture the next keypress when user clicks the keybinding input
  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      // Prevent the PTT listener in RecordingStation from firing on the very same key event
      e.stopImmediatePropagation();
      if (e.code === 'Escape') {
        setCapturing(false);
        return;
      }
      setPttKey(e.code);
      setCapturing(false);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      // Also swallow the matching keyup so RecordingStation doesn't try to stop a non-existent session
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true } as any);
      window.removeEventListener('keyup', onKeyUp, { capture: true } as any);
    };
  }, [capturing, setPttKey]);

  const pttOn = inputStyle === 'ptt';

  return (
    <div className="settings-popover panel-card">
      <div className="settings-popover-header">
        <h3>Cài đặt</h3>
        <button className="topbar-icon-btn" onClick={onClose} title="Đóng">
          <X size={14} />
        </button>
      </div>

      <div className="settings-group">
        <div className="toggle-row">
          <p style={{ fontWeight: 500, fontSize: '0.85rem' }}>Push-to-Talk</p>
          <label className="switch">
            <input
              type="checkbox"
              checked={pttOn}
              onChange={(e) => setInputStyle(e.target.checked ? 'ptt' : 'toggle')}
            />
            <span className="slider"></span>
          </label>
        </div>

        {pttOn && (
          <div className="settings-keybind-row">
            <label className="settings-label">Phím</label>
            <button
              type="button"
              className={`settings-keybind ${capturing ? 'capturing' : ''}`}
              onClick={() => setCapturing(true)}
              title="Click rồi bấm phím muốn dùng"
            >
              {capturing ? (
                <span className="settings-keybind-prompt font-mono">Bấm phím...</span>
              ) : (
                <kbd>{displayKey(pttKey)}</kbd>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="settings-divider"></div>

      <button className="logout-btn settings-logout" onClick={onLogout}>
        <LogOut size={14} />
        Đăng xuất
      </button>
    </div>
  );
};

function displayKey(code: string): string {
  if (code === 'Space') return 'Space';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5) + ' ↑';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
  return code;
}

export default App;
