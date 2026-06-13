import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, ChevronDown, ChevronUp, Activity, RefreshCw } from 'lucide-react';

interface AdminPanelProps {
  apiKey: string;
  onSaveKey: (key: string) => void;
  isKeyValid: 'valid' | 'invalid' | 'unchecked' | 'checking';
  keyError: string;
  onCheckKey: (keyToCheck?: string, modelToCheck?: string) => Promise<boolean>;
  ttsStatus: 'ready' | 'error' | 'checking' | 'unconfigured';
  onCheckTTS: () => Promise<void> | void;
  model: string;
  onSaveModel: (model: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  apiKey,
  onSaveKey,
  isKeyValid,
  keyError,
  onCheckKey,
  ttsStatus,
  onCheckTTS,
  model,
  onSaveModel,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [localKey, setLocalKey] = useState(apiKey);
  const [testing, setTesting] = useState(false);

  const modelOptions = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ];

  const isPreset = modelOptions.some(opt => opt.value === model);
  const [isCustomMode, setIsCustomMode] = useState(!isPreset);
  const [customModelText, setCustomModelText] = useState(isPreset ? '' : model);

  const handleSave = () => {
    onSaveKey(localKey);
  };

  const handleTest = async () => {
    setTesting(true);
    onSaveKey(localKey); // Auto-save first
    try {
      await Promise.all([
        onCheckKey(localKey, model), // Validate with the input key and selected model
        onCheckTTS(),
      ]);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header" onClick={() => setIsOpen(!isOpen)}>
        <h2>
          <Key size={18} className="logo-icon" />
          Cấu hình API Key (Admin)
        </h2>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="panel-content">
              <div className="input-group">
                <label className="input-label">Google AI Studio API Key</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="password"
                    className="input-control"
                    placeholder="AIzaSy..."
                    value={localKey}
                    onChange={(e) => setLocalKey(e.target.value)}
                  />
                  <button className="btn btn-secondary font-mono" onClick={handleSave}>
                    Lưu
                  </button>
                </div>
              </div>

              {/* Model selection dropdown */}
              <div className="input-group">
                <label className="input-label">Mô hình AI (Model)</label>
                <select
                  className="input-control"
                  value={isCustomMode ? 'custom' : model}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setIsCustomMode(true);
                    } else {
                      setIsCustomMode(false);
                      onSaveModel(val);
                    }
                  }}
                  style={{ background: 'var(--bg-input)', color: 'var(--color-text-primary)' }}
                >
                  {modelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-input)' }}>
                      {opt.label}
                    </option>
                  ))}
                  <option value="custom" style={{ background: 'var(--bg-input)' }}>Tùy chỉnh (Nhập slug)...</option>
                </select>
              </div>

              {isCustomMode && (
                <div className="input-group" style={{ marginTop: '-0.5rem' }}>
                  <input
                    type="text"
                    className="input-control font-mono"
                    placeholder="Nhập Gemini model slug"
                    value={customModelText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomModelText(val);
                      onSaveModel(val);
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleTest}
                  disabled={testing}
                  style={{ flex: 1, minWidth: '160px' }}
                >
                  {testing ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Activity size={16} />
                  )}
                  Kiểm tra kết nối
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={onCheckTTS}
                  disabled={ttsStatus === 'checking'}
                  title="Kiểm tra lại trạng thái Edge TTS"
                  style={{ width: '40px', padding: 0 }}
                >
                  <RefreshCw size={16} className={ttsStatus === 'checking' ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Status Badges Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Trạng thái Gemini:
                  </span>
                  {isKeyValid === 'valid' && (
                    <span className="status-badge success font-mono">✅ Hoạt động</span>
                  )}
                  {isKeyValid === 'invalid' && (
                    <span className="status-badge error font-mono">❌ Lỗi key</span>
                  )}
                  {isKeyValid === 'checking' && (
                    <span className="status-badge warning font-mono">Đang kiểm tra...</span>
                  )}
                  {isKeyValid === 'unchecked' && (
                    <span className="status-badge warning font-mono" style={{ opacity: 0.7 }}>Chưa xác thực</span>
                  )}
                </div>
                {isKeyValid === 'invalid' && keyError && (
                  <div
                    className="font-mono"
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--color-error)',
                      lineHeight: 1.4,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {keyError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Trạng thái Edge TTS:
                  </span>
                  {ttsStatus === 'ready' && (
                    <span className="status-badge success font-mono">✅ Edge TTS Local — Sẵn sàng</span>
                  )}
                  {ttsStatus === 'error' && (
                    <span className="status-badge error font-mono">❌ Edge TTS lỗi — Liên hệ hỗ trợ</span>
                  )}
                  {ttsStatus === 'checking' && (
                    <span className="status-badge warning font-mono">Đang kiểm tra...</span>
                  )}
                  {ttsStatus === 'unconfigured' && (
                    <span className="status-badge warning font-mono" style={{ opacity: 0.7 }}>Chưa kiểm tra</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
