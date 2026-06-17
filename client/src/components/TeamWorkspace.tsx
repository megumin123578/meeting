import React, { useState } from 'react';
import {
  Clipboard,
  Languages,
  Loader2,
  Mic,
  Radio,
  Settings2,
  Square,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LanguageSelector, Flag, getLanguageName } from './LanguageSelector';
import { ModelSelector } from './ModelSelector';
import { TranscriptCard } from './TranscriptCard';
import { useTeamLive } from '../hooks/useTeamLive';
import type { TranscriptItem } from '../hooks/useTranslator';

interface TeamWorkspaceProps {
  token: string | null;
  sourceLang: string;
  setSourceLang: (lang: string) => void;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  model: string;
  onSaveModel: (model: string) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  playingCardId: string | null;
  loadingCardId: string | null;
  speakOriginal: (text: string, language: string, cardId: string) => Promise<void>;
  speakAI: (text: string, language: string, cardId: string) => Promise<void>;
  onShowToast: (message: string) => void;
}

const NoopDelete = () => {};

export const TeamWorkspace: React.FC<TeamWorkspaceProps> = ({
  token,
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  model,
  onSaveModel,
  voiceEnabled,
  onToggleVoice,
  playingCardId,
  loadingCardId,
  speakOriginal,
  speakAI,
  onShowToast,
}) => {
  const [joinId, setJoinId] = useState('');
  const [lobbyMode, setLobbyMode] = useState<'create' | 'join' | null>(null);
  const [languagePopupOpen, setLanguagePopupOpen] = useState(false);

  const team = useTeamLive({ token, voiceEnabled, onShowToast });
  const isThisClientSpeaking = team.activeSpeakerId === team.clientId && team.isSpeaking;
  const canSpeak = team.connected && (!team.activeSpeakerId || team.activeSpeakerId === team.clientId);
  const participantCount = team.participants.length;
  const languagePopupVisible = team.connected && (!team.myLanguage || languagePopupOpen);

  const chooseLanguage = (lang: string) => {
    team.setParticipantLanguage(lang);
    setLanguagePopupOpen(false);
  };

  const createRoom = async () => {
    if (sourceLang === targetLang) {
      onShowToast('⚠️ Hãy chọn hai ngôn ngữ khác nhau cho phòng.');
      return;
    }
    await team.createRoom({ sourceLang, targetLang, model });
  };

  const joinRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!joinId.trim()) return;
    await team.joinRoom(joinId);
  };

  const copyRoomId = async () => {
    if (!team.roomId) return;
    try {
      await navigator.clipboard.writeText(team.roomId);
      onShowToast('Đã sao chép mã phòng.');
    } catch {
      onShowToast('Không sao chép được mã phòng.');
    }
  };

  if (!team.connected) {
    return (
      <div className="team-lobby">
        <section className="team-join-panel panel-card">
          <div className="team-lobby-header">
            <div className="team-section-title">
              <Users size={18} className="logo-icon" />
              <h2>Chế độ Team</h2>
            </div>
            <span className="status-pill idle">Chưa vào phòng</span>
          </div>

          <div className="team-choice-grid" aria-label="Chọn cách vào phòng Team">
            <button
              type="button"
              className={`team-choice-card ${lobbyMode === 'create' ? 'active' : ''}`}
              onClick={() => setLobbyMode('create')}
            >
              <Radio size={22} />
              <strong>Tạo phòng mới</strong>
              <span>Thiết lập ngôn ngữ, model, chia sẻ mã phòng.</span>
            </button>
            <button
              type="button"
              className={`team-choice-card ${lobbyMode === 'join' ? 'active' : ''}`}
              onClick={() => setLobbyMode('join')}
            >
              <UserPlus size={22} />
              <strong>Tham gia</strong>
              <span>Tham gia vào phòng có sẵn.</span>
            </button>
          </div>

          {lobbyMode === 'create' && (
            <div className="team-lobby-controls">
              <div className="team-lobby-subtitle">
                <Settings2 size={14} />
                <strong>Cấu hình phòng</strong>
              </div>
              <ModelSelector model={model} onSaveModel={onSaveModel} />
              <LanguageSelector
                sourceLang={sourceLang}
                setSourceLang={setSourceLang}
                targetLang={targetLang}
                setTargetLang={setTargetLang}
                compact
              />
              <button type="button" className="btn btn-primary team-wide-btn" onClick={createRoom}>
                <Radio size={16} />
                Tạo phòng
              </button>
            </div>
          )}

          {lobbyMode === 'join' && (
            <form className="team-join-form" onSubmit={joinRoom}>
              <div className="input-group">
                <label className="input-label">Mã phòng</label>
                <input
                  className="input-control"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={12}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={!joinId.trim()}>
                <UserPlus size={16} />
                Tham gia
              </button>
            </form>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="team-workspace">
      {languagePopupVisible && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (team.myLanguage) setLanguagePopupOpen(false);
          }}
        >
          <div
            className="modal-card team-language-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-language-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <Languages size={18} className="logo-icon" />
              <h3 id="team-language-title" className="modal-title">Ngôn ngữ</h3>
            </div>
            <p className="modal-message">
              Chọn ngôn ngữ của bạn
            </p>
            <div className="settings-radio-group team-language-modal-grid">
              {[team.roomConfig.sourceLang, team.roomConfig.targetLang].map((lang) => {
                const target = lang === team.roomConfig.sourceLang ? team.roomConfig.targetLang : team.roomConfig.sourceLang;
                return (
                  <button
                    key={lang}
                    type="button"
                    className={`settings-radio ${team.myLanguage === lang ? 'active' : ''}`}
                    onClick={() => chooseLanguage(lang)}
                    disabled={team.isSpeaking}
                  >
                    <strong>
                      <Flag code={lang} /> {getLanguageName(lang)}
                    </strong>
                    <span>Dịch sang {getLanguageName(target)}</span>
                  </button>
                );
              })}
            </div>
            {team.myLanguage && (
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setLanguagePopupOpen(false)}>
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="team-grid">
        <aside className="team-sidebar panel-card">
          <section className="team-participants">
            <div className="team-section-title">
              <Users size={16} className="logo-icon" />
              <h3>Thành viên</h3>
              <span className="transcript-count">{participantCount}</span>
            </div>
            <div className="team-participant-list">
              {team.participants.map((participant) => (
                <div key={participant.id} className={`team-participant-row ${participant.isSpeaker ? 'speaking' : ''}`}>
                  <span className="team-avatar">{participant.username.slice(0, 1).toUpperCase()}</span>
                  <span>{participant.username}</span>
                  {participant.language && (
                    <span className="team-self-chip">
                      <Flag code={participant.language} /> {participant.language.split('-')[0].toUpperCase()}
                    </span>
                  )}
                  {participant.id === team.clientId && <span className="team-self-chip">Bạn</span>}
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="team-transcript-panel">
          <div className="team-transcript-header">
            <div className="transcript-header-left">
              <div className="team-room-id-row team-room-id-inline">
                <div>
                  <span className="settings-label">Mã phòng</span>
                  <strong className="team-room-id">{team.roomId}</strong>
                </div>
                <button className="topbar-icon-btn" onClick={copyRoomId} title="Sao chép mã phòng">
                  <Clipboard size={15} />
                </button>
              </div>
            </div>
            <div className="transcript-header-center">
              <div className="team-lang-route">
                <Languages size={14} />
                <span><Flag code={team.roomConfig.sourceLang} /> {getLanguageName(team.roomConfig.sourceLang)}</span>
                <span className="team-route-arrow">↔</span>
                <span><Flag code={team.roomConfig.targetLang} /> {getLanguageName(team.roomConfig.targetLang)}</span>
              </div>
            </div>
            <div className="team-transcript-actions transcript-header-controls">
              <button
                type="button"
                className={`btn btn-secondary icon-only-btn ${voiceEnabled ? 'voice-on' : ''}`}
                title={voiceEnabled ? 'Tắt giọng đọc' : 'Bật giọng đọc'}
                aria-pressed={voiceEnabled}
                onClick={onToggleVoice}
              >
                {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
            </div>
          </div>

          <div className="transcript-scroller team-transcript-scroller">
            {(team.interimSource || team.interimTarget || team.activeSpeakerId) && (
              <div className="transcript-card live-preview team-live-preview">
                <div className="card-meta-bar">
                  <span className="font-mono">
                    <span className="live-dot" /> {team.activeSpeakerName || 'Người nói'}
                  </span>
                </div>
                <div className="card-body-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="card-content-block">
                    <div className="block-title">
                      <Flag code={team.currentSourceLang} />
                      <span className="font-mono">{team.currentSourceLang.split('-')[0].toUpperCase()}</span>
                    </div>
                    <p className="block-text">{team.interimSource || 'Đang nghe...'}</p>
                  </div>
                  <div className="card-content-block" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="block-title">
                      <Flag code={team.currentTargetLang} />
                      <span className="font-mono">{team.currentTargetLang.split('-')[0].toUpperCase()}</span>
                    </div>
                    <p className="block-text">{team.interimTarget || 'Đang dịch...'}</p>
                  </div>
                </div>
              </div>
            )}

            {team.transcripts.length === 0 && !team.activeSpeakerId ? (
              <div className="empty-state team-empty-state">
                <Users size={48} className="empty-state-icon" />
                <h3>Đang chờ giọng nói trong phòng</h3>
                <p>Bắt đầu nói hoặc chia sẻ mã phòng cho người khác.</p>
              </div>
            ) : (
              team.transcripts.map((item: TranscriptItem) => (
                <TranscriptCard
                  key={item.id}
                  item={item}
                  onDelete={team.deleteTranscript || NoopDelete}
                  speakOriginal={speakOriginal}
                  speakAI={speakAI}
                  playingCardId={playingCardId}
                  loadingCardId={loadingCardId}
                />
              ))
            )}
          </div>

          <div className="conversation-composer team-conversation-composer">
            <button
              type="button"
              className={`btn ${isThisClientSpeaking ? 'btn-secondary' : 'btn-primary'} record-btn`}
              style={{
                fontWeight: 'bold',
                background: isThisClientSpeaking ? 'rgba(239, 68, 68, 0.2)' : undefined,
                borderColor: isThisClientSpeaking ? 'rgba(239, 68, 68, 0.4)' : undefined,
                color: isThisClientSpeaking ? '#ef4444' : undefined,
                boxShadow: isThisClientSpeaking ? '0 0 15px rgba(239, 68, 68, 0.25)' : undefined,
              }}
              onClick={() => {
                if (isThisClientSpeaking) team.stopSpeaking();
                else void team.startSpeaking('mic');
              }}
              disabled={!canSpeak || team.isStarting || !team.myLanguage}
            >
              {team.isStarting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isThisClientSpeaking ? (
                <Square size={18} fill="currentColor" />
              ) : (
                <Mic size={18} />
              )}
              {isThisClientSpeaking ? 'Dừng nói' : team.myLanguage ? 'Bắt đầu nói' : 'Chọn ngôn ngữ trước'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
