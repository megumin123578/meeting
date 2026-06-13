import React from 'react';
import { ArrowLeftRight, Globe } from 'lucide-react';

interface LanguageSelectorProps {
  sourceLang: string;
  setSourceLang: (lang: string) => void;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  compact?: boolean;
}

export const languages = [
  { code: 'vi-VN', label: '🇻🇳 Tiếng Việt' },
  { code: 'en-US', label: '🇺🇸 English (US)' },
  { code: 'en-GB', label: '🇬🇧 English (UK)' },
  { code: 'zh-CN', label: '🇨🇳 中文 (简体)' },
  { code: 'ja-JP', label: '🇯🇵 日本語' },
  { code: 'ko-KR', label: '🇰🇷 한국어' },
  { code: 'ms-MY', label: '🇲🇾 Bahasa Melayu' },
  { code: 'fr-FR', label: '🇫🇷 Français' },
  { code: 'de-DE', label: '🇩🇪 Deutsch' }
];

const dropdownBg =
  'var(--bg-input) url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.75rem center';

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  compact = false,
}) => {
  const swapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  if (compact) {
    return (
      <div className="lang-selector-compact">
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="input-control font-mono lang-select-compact"
          style={{ appearance: 'none', background: dropdownBg, backgroundSize: '1rem' }}
          aria-label="Ngôn ngữ nguồn"
        >
          {languages.map((lang) => (
            <option key={`src-${lang.code}`} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>

        <button className="swap-btn swap-btn-compact" onClick={swapLanguages} title="Đảo ngược hai ngôn ngữ">
          <ArrowLeftRight size={12} />
        </button>

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="input-control font-mono lang-select-compact"
          style={{ appearance: 'none', background: dropdownBg, backgroundSize: '1rem' }}
          aria-label="Ngôn ngữ đích"
        >
          {languages.map((lang) => (
            <option key={`dest-${lang.code}`} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Globe size={18} className="logo-icon" />
        Cấu hình ngôn ngữ
      </h2>

      <div className="lang-selector-grid">
        <div className="input-group">
          <label className="input-label">Ngôn ngữ nguồn</label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="input-control font-mono"
            style={{ appearance: 'none', background: dropdownBg, backgroundSize: '1.25rem' }}
          >
            {languages.map((lang) => (
              <option key={`src-${lang.code}`} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <button className="swap-btn" onClick={swapLanguages} title="Đảo ngược hai ngôn ngữ">
          <ArrowLeftRight size={14} />
        </button>

        <div className="input-group">
          <label className="input-label">Ngôn ngữ đích</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="input-control font-mono"
            style={{ appearance: 'none', background: dropdownBg, backgroundSize: '1.25rem' }}
          >
            {languages.map((lang) => (
              <option key={`dest-${lang.code}`} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
