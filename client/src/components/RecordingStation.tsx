import React, { useEffect, useRef } from 'react';
import { Mic, Square } from 'lucide-react';
import { WaveAnimation } from './WaveAnimation';
import type { RecordingMode, InputStyle } from '../App';

interface RecordingStationProps {
  mode: RecordingMode;
  setMode: (m: RecordingMode) => void;
  inputStyle: InputStyle;
  pttKey: string;
  isLiveModelSelected: boolean;
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
  cabinInterval: number;
  setCabinInterval: (val: number) => void;
  analyser: AnalyserNode | null;
  isTranslating: boolean;
}

const MODE_OPTIONS: Array<{ value: RecordingMode; label: string; hint?: string }> = [
  { value: 'normal', label: 'Bình thường', hint: 'Thu rồi gửi đi dịch' },
  { value: 'cabin', label: 'Meeting Segment', hint: 'Tự cắt mỗi N giây' },
  { value: 'realtime', label: 'Real-time (Web Speech)', hint: 'Browser transcribe streaming' },
  { value: 'live', label: 'Live Translate (Gemini)' },
];

export const RecordingStation: React.FC<RecordingStationProps> = ({
  mode,
  setMode,
  inputStyle,
  pttKey,
  isLiveModelSelected,
  isActive,
  onStart,
  onStop,
  cabinInterval,
  setCabinInterval,
  analyser,
  isTranslating,
}) => {
  const isPttActiveRef = useRef(false);

  // PTT only applies to 'normal' mode
  const usePtt = mode === 'normal' && inputStyle === 'ptt';

  // Mouse / touch PTT: also handle release outside the button
  useEffect(() => {
    const handleGlobalUp = () => {
      if (usePtt && isPttActiveRef.current) {
        isPttActiveRef.current = false;
        onStop();
      }
    };
    if (usePtt) {
      window.addEventListener('mouseup', handleGlobalUp);
      window.addEventListener('touchend', handleGlobalUp);
    }
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [usePtt, onStop]);

  // Keyboard PTT: hold the configured key to record
  useEffect(() => {
    if (!usePtt) return;

    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== pttKey || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      if (isPttActiveRef.current || isTranslating) return;
      e.preventDefault();
      isPttActiveRef.current = true;
      onStart();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== pttKey) return;
      if (!isPttActiveRef.current) return;
      e.preventDefault();
      isPttActiveRef.current = false;
      onStop();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [usePtt, pttKey, onStart, onStop, isTranslating]);

  const handlePttDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!usePtt || isActive || isTranslating) return;
    isPttActiveRef.current = true;
    onStart();
  };

  const currentMode = MODE_OPTIONS.find((m) => m.value === mode);

  return (
    <div className="panel-card recording-station">
      <div className="recording-station-header">
        <h2>
          <Mic size={18} className="logo-icon" />
          Recording Station
        </h2>
      </div>

      <div className="mode-selector">
        <label className="mode-label">Chế độ thu âm</label>
        <select
          className="model-select mode-select"
          value={mode}
          onChange={(e) => {
            if (isActive) onStop();
            setMode(e.target.value as RecordingMode);
          }}
        >
          {MODE_OPTIONS.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.value === 'live' ? !isLiveModelSelected : isLiveModelSelected}
            >
              {opt.label}
            </option>
          ))}
        </select>
        {currentMode?.hint && (
          <span className="mode-hint font-mono">{currentMode.hint}</span>
        )}
      </div>

      {mode === 'cabin' && (
        <div className="cabin-interval-row">
          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Chu kỳ:
          </span>
          <input
            type="number"
            min="5"
            max="60"
            value={cabinInterval}
            disabled={isActive}
            onChange={(e) => setCabinInterval(Math.max(5, parseInt(e.target.value) || 5))}
            className="input-control font-mono"
            style={{ width: '70px', padding: '0.3rem 0.5rem', textAlign: 'center' }}
          />
          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            giây
          </span>
        </div>
      )}

      <WaveAnimation isRecording={isActive} analyser={analyser} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        {usePtt ? (
          <button
            className="btn btn-primary record-btn"
            style={{
              userSelect: 'none',
              background: isActive ? 'rgba(239, 68, 68, 0.3)' : undefined,
              borderColor: isActive ? 'rgba(239, 68, 68, 0.5)' : undefined,
              boxShadow: isActive ? '0 0 15px rgba(239, 68, 68, 0.3)' : undefined,
              cursor: isActive ? 'grabbing' : 'pointer',
            }}
            onMouseDown={handlePttDown}
            onTouchStart={handlePttDown}
            disabled={isTranslating}
          >
            <Mic size={18} />
            {isActive
              ? `Đang thu... Buông ${pttKey === 'Space' ? 'Space' : 'phím/chuột'} để dừng`
              : `Giữ chuột hoặc phím ${displayKey(pttKey)} để nói`}
          </button>
        ) : (
          <button
            className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'} record-btn`}
            style={{
              fontWeight: 'bold',
              background: isActive ? 'rgba(239, 68, 68, 0.2)' : undefined,
              borderColor: isActive ? 'rgba(239, 68, 68, 0.4)' : undefined,
              color: isActive ? '#ef4444' : undefined,
              boxShadow: isActive ? '0 0 15px rgba(239, 68, 68, 0.25)' : undefined,
            }}
            onClick={isActive ? onStop : onStart}
            disabled={isTranslating}
          >
            {isActive ? (
              <>
                <Square size={18} fill="currentColor" />
                {labelForActive(mode)}
              </>
            ) : (
              <>
                <Mic size={18} />
                {labelForIdle(mode)}
              </>
            )}
          </button>
        )}

        {isTranslating && (
          <span
            className="font-mono"
            style={{ fontSize: '0.75rem', color: 'var(--color-accent-indigo)', animation: 'pulse 1.5s infinite' }}
          >
            ⏳ Đang gửi văn bản dịch thuật...
          </span>
        )}
      </div>
    </div>
  );
};

function displayKey(code: string): string {
  if (code === 'Space') return 'Space';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
  return code;
}

function labelForIdle(mode: RecordingMode): string {
  switch (mode) {
    case 'cabin': return 'Bắt đầu thu cabin';
    case 'realtime': return 'Bắt đầu dịch trực tiếp';
    case 'live': return 'Bắt đầu Live Translate';
    default: return 'Bắt đầu thu âm';
  }
}

function labelForActive(mode: RecordingMode): string {
  switch (mode) {
    case 'cabin': return 'Dừng thu cabin';
    case 'realtime': return 'Dừng dịch trực tiếp';
    case 'live': return 'Dừng Live Translate';
    default: return 'Dừng ghi âm';
  }
}
