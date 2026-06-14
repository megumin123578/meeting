import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

interface ModelSelectorProps {
  model: string;
  onSaveModel: (model: string) => void;
}

export const MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-3.5-live-translate-preview', label: 'Gemini 3.5 Live Translate' },
];

const CUSTOM_VALUE = '__custom__';

export const ModelSelector: React.FC<ModelSelectorProps> = ({ model, onSaveModel }) => {
  const isPreset = MODEL_OPTIONS.some((opt) => opt.value === model);
  const [customMode, setCustomMode] = useState(!isPreset && !!model);
  const [draft, setDraft] = useState(isPreset ? '' : model);

  // Sync when external model changes (server load, parent updates)
  useEffect(() => {
    const matches = MODEL_OPTIONS.some((opt) => opt.value === model);
    setCustomMode(!matches && !!model);
    setDraft(matches ? '' : model);
  }, [model]);

  if (customMode) {
    return (
      <div className="model-selector custom">
        <input
          type="text"
          className="input-control font-mono model-input"
          value={draft}
          placeholder="gemini-..."
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              onSaveModel(draft.trim());
              setCustomMode(false);
            } else if (e.key === 'Escape') {
              setCustomMode(false);
              setDraft(isPreset ? '' : model);
            }
          }}
        />
        <button
          type="button"
          className="model-icon-btn confirm"
          title="Lưu slug"
          onClick={() => {
            if (draft.trim()) {
              onSaveModel(draft.trim());
              setCustomMode(false);
            }
          }}
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          className="model-icon-btn cancel"
          title="Huỷ"
          onClick={() => {
            setCustomMode(false);
            setDraft(isPreset ? '' : model);
          }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="model-selector">
      <select
        className="input-control font-mono model-select"
        value={isPreset ? model : CUSTOM_VALUE}
        onChange={(e) => {
          const v = e.target.value;
          if (v === CUSTOM_VALUE) {
            setCustomMode(true);
            setDraft(isPreset ? '' : model);
          } else {
            onSaveModel(v);
          }
        }}
      >
        {MODEL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {!isPreset && model && (
          <option value={model}>Tùy chỉnh: {model}</option>
        )}
        <option value={CUSTOM_VALUE}>Tùy chỉnh slug…</option>
      </select>
    </div>
  );
};
