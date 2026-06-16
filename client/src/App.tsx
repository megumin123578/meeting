import React, { useState, useEffect } from 'react';
import { useTranslator } from './hooks/useTranslator';
import { useSessions } from './hooks/useSessions';
import { useRecorder } from './hooks/useRecorder';
import { useEdgeTTS } from './hooks/useEdgeTTS';
import { useRealtimeTranslator } from './hooks/useRealtimeTranslator';
import { useLiveTranslate } from './hooks/useLiveTranslate';
import { useAuth, type AuthUser } from './hooks/useAuth';
import { RecordingStation } from './components/RecordingStation';
import { RecordButton } from './components/RecordButton';
import { WaveAnimation } from './components/WaveAnimation';
import { TranscriptList } from './components/TranscriptList';
import { SessionSidebar } from './components/SessionSidebar';
import { ConfirmProvider } from './components/ConfirmDialog';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { CheckCircle2, AlertTriangle, LogOut, User, Loader2, Settings as SettingsIcon, X, Activity, RefreshCw, ShieldCheck } from 'lucide-react';

export type RecordingMode = 'normal' | 'cabin' | 'realtime' | 'live';
export type InputStyle = 'toggle' | 'ptt';

export const App: React.FC = () => {
  const { token, user, loading, login, register, resetPassword, logout } = useAuth();

  if (loading) {
    return (
      <div className="login-shell">
        <Loader2 size={32} className="animate-spin logo-icon" />
      </div>
    );
  }

  if (!token || !user) {
    return <LoginPage onLogin={login} onRegister={register} onReset={resetPassword} />;
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
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
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
  const [liveSource, setLiveSource] = useState<'mic' | 'tab'>(
    () => (localStorage.getItem('live_source') === 'tab' ? 'tab' : 'mic')
  );
  const [liveVoiceEnabled, setLiveVoiceEnabled] = useState<boolean>(
    () => localStorage.getItem('live_voice') !== 'off'
  );
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    setShowSettings(false);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 4000);
  };

  const {
    sessions,
    activeId,
    transcripts,
    loading: sessionsLoading,
    ensureActiveSession,
    createSession,
    selectSession,
    renameSession,
    deleteSession,
    addTranscriptItem,
    deleteTranscript,
    exportSession,
  } = useSessions({ token, userId: user.id, onShowToast: showToast });

  const {
    apiKey,
    saveApiKey,
    isKeyValid,
    keyError,
    checkApiKey,
    ttsStatus,
    checkEdgeTTS,
    isTranslating,
    translateAudio,
    translateText,
    model,
    saveModel,
  } = useTranslator({ onShowToast: showToast, token, onTranscript: addTranscriptItem });

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
    voiceEnabled: liveVoiceEnabled,
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
    localStorage.setItem('live_source', liveSource);
  }, [liveSource]);

  useEffect(() => {
    localStorage.setItem('live_voice', liveVoiceEnabled ? 'on' : 'off');
  }, [liveVoiceEnabled]);

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

  const handleStart = async () => {
    const sessionId = await ensureActiveSession();
    if (!sessionId) return;

    if (mode === 'live') {
      await startLive(liveSource);
      return;
    }
    if (mode === 'realtime') {
      startListening();
      return;
    }
    await startRecording(sourceLang);
  };

  const keyDot =
    isKeyValid === 'valid' ? 'ok' :
    isKeyValid === 'invalid' ? 'err' :
    isKeyValid === 'checking' ? 'pending' : 'idle';
  const ttsDot =
    ttsStatus === 'ready' ? 'ok' :
    ttsStatus === 'error' ? 'err' :
    ttsStatus === 'checking' ? 'pending' : 'idle';

  const isActive =
    mode === 'live' ? isLive : mode === 'realtime' ? isListening : isRecording;
  const activeAnalyser = mode === 'live' ? liveAnalyser : analyser;
  const handleStop =
    mode === 'live' ? stopLive : mode === 'realtime' ? stopListening : stopRecording;
  const isAdminPage = currentPath === '/admin';

  if (isAdminPage) {
    return (
      <ConfirmProvider>
        <div className="app-container admin-page-container">
          <header className="app-header">
            <div className="app-title-section">
              <h1 className="app-title">SpeakLink</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="user-chip">
                <User size={12} />
                <strong>{user.username}</strong>
              </span>
              <button className="topbar-icon-btn" onClick={() => navigateTo('/')} title="Về trang chính">
                <X size={16} />
              </button>
              <button className="topbar-icon-btn" onClick={onLogout} title="Đăng xuất">
                <LogOut size={16} />
              </button>
            </div>
          </header>

          {user.isAdmin ? (
            <AdminDashboard
              token={token}
              currentUserId={user.id}
              onClose={() => navigateTo('/')}
              onShowToast={showToast}
              variant="page"
            />
          ) : (
            <div className="admin-denied panel-card">
              <ShieldCheck size={28} className="logo-icon" />
              <h2>Không có quyền truy cập</h2>
              <p>Chỉ tài khoản admin mới mở được dashboard này.</p>
              <button className="btn btn-primary" onClick={() => navigateTo('/')}>
                Về trang chính
              </button>
            </div>
          )}

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
      </ConfirmProvider>
    );
  }

  return (
    <ConfirmProvider>
    <div className="app-container">
      <header className="app-header">
        <div className="app-title-section">
          <h1 className="app-title">SpeakLink</h1>
        </div>
        <WaveAnimation isRecording={isActive} analyser={activeAnalyser} className="topbar-wave" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative' }}>
          <button
            className="status-pill-group topbar-status"
            onClick={() => setShowSettings((v) => !v)}
            title="Trạng thái kết nối — bấm để mở cài đặt"
          >
            <span className={`status-pill ${keyDot}`}>Gemini</span>
            <span className={`status-pill ${ttsDot}`}>TTS</span>
          </button>
          <span className="user-chip">
            <User size={12} />
            <strong>{user.username}</strong>
          </span>
          {user.isAdmin && (
            <button
              className="topbar-icon-btn"
              onClick={() => navigateTo('/admin')}
              title="Quản trị người dùng"
            >
              <ShieldCheck size={16} />
            </button>
          )}
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
              apiKey={apiKey}
              onSaveKey={saveApiKey}
              isKeyValid={isKeyValid}
              keyError={keyError}
              onCheckKey={checkApiKey}
              ttsStatus={ttsStatus}
              onCheckTTS={checkEdgeTTS}
              model={model}
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
          <SessionSidebar
            sessions={sessions}
            activeId={activeId}
            onSelect={selectSession}
            onCreate={createSession}
            onRename={renameSession}
            onDelete={deleteSession}
            onExport={exportSession}
          />
          <RecordingStation
            mode={mode}
            setMode={setMode}
            isLiveModelSelected={isLiveModelSelected}
            isActive={isActive}
            onStop={handleStop}
            cabinInterval={cabinInterval}
            setCabinInterval={setCabinInterval}
            liveSource={liveSource}
            setLiveSource={setLiveSource}
          />
        </div>

        <div className="content-col">
          <div className="transcript-panel">
            <TranscriptList
              transcripts={transcripts}
              loading={sessionsLoading}
              onDelete={deleteTranscript}
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
              isLiveMode={mode === 'live'}
              voiceEnabled={liveVoiceEnabled}
              onToggleVoice={() => setLiveVoiceEnabled((v) => !v)}
            />
            <RecordButton
              mode={mode}
              inputStyle={inputStyle}
              pttKey={pttKey}
              isActive={isActive}
              onStart={() => void handleStart()}
              onStop={handleStop}
              isTranslating={isTranslating}
            />
          </div>
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
    </ConfirmProvider>
  );
};

interface SettingsPopoverProps {
  apiKey: string;
  onSaveKey: (key: string) => void;
  isKeyValid: 'valid' | 'invalid' | 'unchecked' | 'checking';
  keyError: string;
  onCheckKey: (keyToCheck?: string, modelToCheck?: string) => Promise<boolean>;
  ttsStatus: 'ready' | 'error' | 'checking' | 'unconfigured';
  onCheckTTS: () => Promise<void> | void;
  model: string;
  inputStyle: InputStyle;
  setInputStyle: (s: InputStyle) => void;
  pttKey: string;
  setPttKey: (k: string) => void;
  onLogout: () => void;
  onClose: () => void;
}

const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  apiKey,
  onSaveKey,
  isKeyValid,
  keyError,
  onCheckKey,
  onCheckTTS,
  model,
  inputStyle,
  setInputStyle,
  pttKey,
  setPttKey,
  onLogout,
  onClose,
}) => {
  const [capturing, setCapturing] = useState(false);
  const [localKey, setLocalKey] = useState(apiKey);
  const [testing, setTesting] = useState(false);

  // Sync local state when parent loads config from server asynchronously.
  useEffect(() => {
    setLocalKey(apiKey);
  }, [apiKey]);

  // Auto-save the API key (debounced) — no manual save button.
  useEffect(() => {
    if (localKey === apiKey) return;
    const t = setTimeout(() => onSaveKey(localKey), 600);
    return () => clearTimeout(t);
  }, [localKey, apiKey, onSaveKey]);

  const handleTest = async () => {
    setTesting(true);
    onSaveKey(localKey); // Persist immediately before testing
    try {
      await Promise.all([onCheckKey(localKey, model), onCheckTTS()]);
    } finally {
      setTesting(false);
    }
  };

  const testIcon = testing ? (
    <RefreshCw size={16} className="animate-spin" />
  ) : isKeyValid === 'valid' ? (
    <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
  ) : isKeyValid === 'invalid' ? (
    <AlertTriangle size={16} style={{ color: 'var(--color-error)' }} />
  ) : (
    <Activity size={16} />
  );

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
        <label className="settings-label">Google AI Studio API Key</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="password"
            className="input-control"
            placeholder="AIzaSy..."
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
          />
          <button
            className="topbar-icon-btn settings-test-btn"
            onClick={handleTest}
            disabled={testing}
            title="Kiểm tra kết nối"
          >
            {testIcon}
          </button>
        </div>
        {isKeyValid === 'invalid' && keyError && (
          <div
            className="font-mono"
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-error)',
              lineHeight: 1.4,
              overflowWrap: 'anywhere',
              background: 'rgba(239, 68, 68, 0.06)',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            {keyError}
          </div>
        )}
      </div>

      <div className="settings-divider"></div>

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
