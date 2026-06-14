import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Layers } from 'lucide-react';
import { WaveAnimation } from './WaveAnimation';

interface RecordingStationProps {
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  cabinMode: boolean;
  setCabinMode: (val: boolean) => void;
  cabinInterval: number;
  setCabinInterval: (val: number) => void;
  analyser: AnalyserNode | null;
  isTranslating: boolean;
  realtimeMode: boolean;
  setRealtimeMode: (val: boolean) => void;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  liveMode?: boolean;
}

export const RecordingStation: React.FC<RecordingStationProps> = ({
  isRecording,
  startRecording,
  stopRecording,
  cabinMode,
  setCabinMode,
  cabinInterval,
  setCabinInterval,
  analyser,
  isTranslating,
  realtimeMode,
  setRealtimeMode,
  isListening,
  startListening,
  stopListening,
  liveMode = false,
}) => {
  const [recordMode, setRecordMode] = useState<'toggle' | 'ptt'>('toggle');
  const isPttActiveRef = useRef(false);

  // Push-to-Talk window listeners (handling mouseup outside button)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (recordMode === 'ptt' && isPttActiveRef.current) {
        isPttActiveRef.current = false;
        stopRecording();
      }
    };

    if (recordMode === 'ptt') {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchend', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [recordMode, stopRecording]);

  // Handle PTT press
  const handlePttDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (recordMode !== 'ptt' || isRecording || isTranslating) return;
    isPttActiveRef.current = true;
    startRecording();
  };

  return (
    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Mic size={18} className="logo-icon" />
          {liveMode ? 'Live Translate' : 'Recording Station'}
        </h2>
        
        {/* Toggle / PTT selector tabs */}
        {!realtimeMode && !liveMode && (
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-input)',
              borderRadius: '0.35rem',
              padding: '2px',
              border: '1px solid var(--border-color)',
            }}
          >
          <button
            className="font-mono"
            style={{
              background: recordMode === 'toggle' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none',
              borderRadius: '0.25rem',
              color: recordMode === 'toggle' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              padding: '0.25rem 0.5rem',
              fontSize: '0.65rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={() => {
              if (isRecording) stopRecording();
              setRecordMode('toggle');
            }}
          >
            Bật/Tắt
          </button>
          <button
            className="font-mono"
            style={{
              background: recordMode === 'ptt' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none',
              borderRadius: '0.25rem',
              color: recordMode === 'ptt' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              padding: '0.25rem 0.5rem',
              fontSize: '0.65rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={() => {
              if (isRecording) stopRecording();
              setRecordMode('ptt');
            }}
          >
            Nhấn-Giữ
          </button>
        </div>
      )}
    </div>

      {/* Wave visualizer */}
      <WaveAnimation isRecording={isListening || isRecording} analyser={analyser} />

      {/* Recording controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        {liveMode ? (
          <button
            className={`btn ${isRecording ? 'btn-secondary' : 'btn-primary'}`}
            style={{
              width: '100%',
              height: '48px',
              fontWeight: 'bold',
              background: isRecording ? 'rgba(239, 68, 68, 0.2)' : undefined,
              borderColor: isRecording ? 'rgba(239, 68, 68, 0.4)' : undefined,
              color: isRecording ? '#ef4444' : undefined,
              boxShadow: isRecording ? '0 0 15px rgba(239, 68, 68, 0.25)' : undefined,
            }}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranslating}
          >
            {isRecording ? (
              <>
                <Square size={18} fill="currentColor" />
                Dừng Live Translate
              </>
            ) : (
              <>
                <Mic size={18} />
                Bắt đầu Live Translate
              </>
            )}
          </button>
        ) : realtimeMode ? (
          <button
            className={`btn ${isListening ? 'btn-secondary' : 'btn-primary'}`}
            style={{
              width: '100%',
              height: '48px',
              fontWeight: 'bold',
              background: isListening ? 'rgba(239, 68, 68, 0.2)' : undefined,
              borderColor: isListening ? 'rgba(239, 68, 68, 0.4)' : undefined,
              color: isListening ? '#ef4444' : undefined,
              boxShadow: isListening ? '0 0 15px rgba(239, 68, 68, 0.25)' : undefined
            }}
            onClick={isListening ? stopListening : startListening}
            disabled={isTranslating}
          >
            {isListening ? (
              <>
                <Square size={18} fill="currentColor" />
                Dừng dịch trực tiếp
              </>
            ) : (
              <>
                <Mic size={18} />
                Bắt đầu dịch trực tiếp
              </>
            )}
          </button>
        ) : recordMode === 'toggle' ? (
          <button
            className={`btn ${isRecording ? 'btn-secondary' : 'btn-primary'}`}
            style={{
              width: '100%',
              height: '48px',
              fontWeight: 'bold',
              background: isRecording ? 'rgba(239, 68, 68, 0.2)' : undefined,
              borderColor: isRecording ? 'rgba(239, 68, 68, 0.4)' : undefined,
              color: isRecording ? '#ef4444' : undefined,
              boxShadow: isRecording ? '0 0 15px rgba(239, 68, 68, 0.25)' : undefined
            }}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranslating}
          >
            {isRecording ? (
              <>
                <Square size={18} fill="currentColor" />
                Dừng ghi âm
              </>
            ) : (
              <>
                <Mic size={18} />
                Bắt đầu thu âm
              </>
            )}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '48px',
              userSelect: 'none',
              background: isRecording ? 'rgba(239, 68, 68, 0.3)' : undefined,
              borderColor: isRecording ? 'rgba(239, 68, 68, 0.5)' : undefined,
              boxShadow: isRecording ? '0 0 15px rgba(239, 68, 68, 0.3)' : undefined,
              cursor: isRecording ? 'grabbing' : 'pointer'
            }}
            onMouseDown={handlePttDown}
            onTouchStart={handlePttDown}
            disabled={isTranslating}
          >
            <Mic size={18} />
            {isRecording ? 'Đang thu... Buông chuột để dừng' : 'Giữ chuột để nói (Push-to-Talk)'}
          </button>
        )}

        {isTranslating && (
          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-accent-indigo)', animation: 'pulse 1.5s infinite' }}>
            ⏳ Đang gửi văn bản dịch thuật...
          </span>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

      {/* Meeting cabin segment translator controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="toggle-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={16} style={{ color: 'var(--color-accent-indigo)' }} />
            <div>
              <p style={{ fontWeight: 500 }}>Chế độ Meeting Segment</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Tự động dịch cabin rảnh tay</p>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={cabinMode}
              disabled={isRecording || isListening || liveMode}
              onChange={(e) => {
                const checked = e.target.checked;
                setCabinMode(checked);
                if (checked) {
                  setRealtimeMode(false);
                }
              }}
            />
            <span className="slider"></span>
          </label>
        </div>

        {cabinMode && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-input)',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border-color)',
            }}
          >
            <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Chu kỳ dịch thuật:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                min="5"
                max="60"
                value={cabinInterval}
                onChange={(e) => setCabinInterval(Math.max(5, parseInt(e.target.value) || 5))}
                className="input-control font-mono"
                style={{ width: '60px', padding: '0.25rem', textAlign: 'center' }}
              />
              <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>giây</span>
            </div>
          </div>
        )}

        {/* Real-time Mode toggle row */}
        <div className="toggle-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={16} style={{ color: 'var(--color-accent-indigo)' }} />
            <div>
              <p style={{ fontWeight: 500 }}>Chế độ Dịch trực tiếp (Real-time)</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Dịch trực tiếp từ giọng nói</p>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={realtimeMode}
              disabled={isRecording || isListening || liveMode}
              onChange={(e) => {
                const checked = e.target.checked;
                setRealtimeMode(checked);
                if (checked) {
                  setCabinMode(false);
                }
              }}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
};
