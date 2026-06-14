import React from 'react';
import { AnimatePresence } from 'motion/react';
import { FileDown, Trash2, MessageSquareDashed, Sparkles } from 'lucide-react';
import { TranscriptCard } from './TranscriptCard';
import { LanguageSelector, languages } from './LanguageSelector';
import { ModelSelector } from './ModelSelector';
import type { TranscriptItem } from '../hooks/useTranslator';

interface TranscriptListProps {
  transcripts: TranscriptItem[];
  onDelete: (id: string) => void;
  onClear: () => void;
  speakOriginal: (text: string, language: string, cardId: string) => Promise<void>;
  speakAI: (text: string, language: string, cardId: string) => Promise<void>;
  playingCardId: string | null;
  loadingCardId: string | null;
  interimSource?: string;
  interimTarget?: string;
  isTranslatingRealtime?: boolean;
  sourceLang: string;
  setSourceLang: (lang: string) => void;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  model: string;
  onSaveModel: (model: string) => void;
}

export const TranscriptList: React.FC<TranscriptListProps> = ({
  transcripts,
  onDelete,
  onClear,
  speakOriginal,
  speakAI,
  playingCardId,
  loadingCardId,
  interimSource = '',
  interimTarget = '',
  isTranslatingRealtime = false,
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  model,
  onSaveModel,
}) => {
  const hasInterim = !!(interimSource || interimTarget);
  const getFlag = (code: string) => languages.find((l) => l.code === code)?.label.split(' ')[0] || '🌐';
  const getCode = (code: string) => code.split('-')[0].toUpperCase();

  const handleExportMarkdown = () => {
    if (transcripts.length === 0) return;

    let mdContent = `# Biên bản dịch thuật song thoại - SpeakLink\n`;
    mdContent += `Xuất lúc: ${new Date().toLocaleString('vi-VN')}\n`;
    mdContent += `Tổng số đoạn dịch: ${transcripts.length}\n\n`;
    mdContent += `=========================================================\n\n`;

    transcripts.forEach((item, index) => {
      mdContent += `### [Phần ${transcripts.length - index}] - Lịch: ${item.timestamp}\n`;
      mdContent += `🌐 Hướng dịch: ${item.sourceLang} ➡️ ${item.targetLang}\n\n`;
      mdContent += `**Văn bản gốc (${item.sourceLang.split('-')[0].toUpperCase()}):**\n`;
      mdContent += `${item.originalText}\n\n`;
      mdContent += `**Bản dịch AI (${item.targetLang.split('-')[0].toUpperCase()}):**\n`;
      mdContent += `${item.translatedText}\n\n`;
      mdContent += `---\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Format date string for filename
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `SpeakLink_Transcript_${dateStr}.md`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Header Bar */}
      <div className="transcript-header-bar">
        <ModelSelector model={model} onSaveModel={onSaveModel} />

        <div className="transcript-header-controls">
          <LanguageSelector
            sourceLang={sourceLang}
            setSourceLang={setSourceLang}
            targetLang={targetLang}
            setTargetLang={setTargetLang}
            compact
          />

          {transcripts.length > 0 && (
            <div className="transcript-actions">
              <button className="btn btn-secondary font-mono icon-only-btn" title="Xuất Markdown" onClick={handleExportMarkdown}>
                <FileDown size={14} />
              </button>
              <button
                className="btn btn-secondary font-mono icon-only-btn"
                title="Xoá tất cả"
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.15)' }}
                onClick={() => {
                  if (window.confirm('Bạn có chắc muốn xóa tất cả lịch sử hội thoại này không?')) {
                    onClear();
                  }
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Scroller Area */}
      <div className="transcript-scroller">
        {/* Real-time live preview card */}
        {(hasInterim || isTranslatingRealtime) && (
          <div className="transcript-card live-preview" style={{
            borderColor: 'var(--color-accent-indigo)',
            borderStyle: 'dashed',
            background: 'rgba(99, 102, 241, 0.05)',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.1)',
            marginBottom: '1rem',
            animation: 'pulse 2s infinite'
          }}>
            <div className="card-meta-bar" style={{ background: 'rgba(99, 102, 241, 0.1)', borderBottomColor: 'rgba(99, 102, 241, 0.2)' }}>
              <span className="font-mono" style={{ color: 'var(--color-accent-indigo)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className="live-dot" /> DỊCH TRỰC TIẾP (REAL-TIME)...
              </span>
            </div>
            <div className="card-body-grid" style={{ gridTemplateColumns: '1fr' }}>
              {/* Source block */}
              <div className="card-content-block" style={{ background: 'transparent' }}>
                <div className="block-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{getFlag(sourceLang)}</span>
                    <span className="font-mono">{getCode(sourceLang)}</span>
                  </span>
                </div>
                <p className="block-text" style={{ fontStyle: 'italic', opacity: 0.9, whiteSpace: 'pre-line' }}>
                  {interimSource || 'Đang lắng nghe giọng nói của bạn...'}
                </p>
              </div>

              {/* Target block */}
              <div className="card-content-block" style={{ background: 'transparent', borderTop: '1px solid var(--border-color)' }}>
                <div className="block-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{getFlag(targetLang)}</span>
                    <span className="font-mono">{getCode(targetLang)}</span>
                    <Sparkles size={11} style={{ color: 'var(--color-accent-teal)' }} />
                  </span>
                </div>
                <p className="block-text" style={{ color: 'var(--color-text-primary)', fontWeight: 500, whiteSpace: 'pre-line' }}>
                  {interimTarget || (
                    <span className="font-mono" style={{ fontStyle: 'italic', opacity: 0.7, color: 'var(--color-accent-indigo)' }}>
                      ⏳ Đang dịch...
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {transcripts.length === 0 && !hasInterim && !isTranslatingRealtime ? (
          <div className="empty-state">
            <MessageSquareDashed size={48} className="empty-state-icon" />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)' }}>Chưa có đoạn hội thoại nào</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: '280px' }}>
              Hãy nhấn thu âm hoặc kéo thả file âm thanh vào để xem kết quả STT và dịch thuật thời gian thực.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {transcripts.map((item) => (
              <TranscriptCard
                key={item.id}
                item={item}
                onDelete={onDelete}
                speakOriginal={speakOriginal}
                speakAI={speakAI}
                playingCardId={playingCardId}
                loadingCardId={loadingCardId}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </>
  );
};
