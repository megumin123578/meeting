import React, { useCallback, useEffect, useState } from 'react';
import { History, Loader2, RefreshCw } from 'lucide-react';

interface ConversationHistoryPageProps {
  token: string;
  onShowToast: (message: string) => void;
}

interface HistoryRoom {
  id: string;
  roomCode: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  createdAt: string;
  closedAt: string | null;
  transcriptCount: number;
}

interface HistoryTranscript {
  id: string;
  exportId: string;
  roomCode: string;
  speakerId: string | null;
  speakerName: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  createdAt: string;
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const ConversationHistoryPage: React.FC<ConversationHistoryPageProps> = ({ token, onShowToast }) => {
  const [rooms, setRooms] = useState<HistoryRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<HistoryRoom | null>(null);
  const [transcripts, setTranscripts] = useState<HistoryTranscript[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team-live/history?limit=50&state=closed', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'load history failed');
      const nextRooms = data.rooms || [];
      setRooms(nextRooms);
      setSelectedRoom((prev) => {
        if (prev && nextRooms.some((room: HistoryRoom) => room.id === prev.id)) return prev;
        return nextRooms[0] || null;
      });
      if (nextRooms.length === 0) setTranscripts([]);
    } catch (err: any) {
      onShowToast(`❌ ${err?.message || 'Không tải được lịch sử hội thoại.'}`);
    } finally {
      setLoading(false);
    }
  }, [onShowToast, token]);

  const loadRoomDetail = useCallback(async (roomCode: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/team-live/history/${encodeURIComponent(roomCode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'load history detail failed');
      setTranscripts(data.transcripts || []);
    } catch (err: any) {
      setSelectedRoom(null);
      setTranscripts([]);
      onShowToast(`❌ ${err?.message || 'Không tải được nội dung hội thoại.'}`);
    } finally {
      setDetailLoading(false);
    }
  }, [onShowToast, token]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!selectedRoom) return;
    void loadRoomDetail(selectedRoom.roomCode);
  }, [loadRoomDetail, selectedRoom]);

  return (
    <div className="app-container team-mode-container">
      <div className="team-workspace team-history-workspace">
        <section className="team-join-panel panel-card team-history-layout">
          <div className="team-history-sidebar">
            <div className="team-lobby-subtitle team-history-titlebar">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <History size={14} />
              <strong>Lịch sử hội thoại</strong>
              {loading && <Loader2 size={14} className="animate-spin" />}
              </div>
              <button type="button" className="topbar-icon-btn" onClick={() => void loadRooms()} title="Tải lại">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            {rooms.length === 0 ? (
              <div className="admin-empty compact">Chưa có hội thoại nào đã đóng.</div>
            ) : (
              <div className="team-history-list team-history-list-scroll">
                {rooms.map((room) => {
                  const isActive = selectedRoom?.id === room.id;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      className={`team-history-row ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <div>
                        <strong>{room.roomCode}</strong>
                        <span className="admin-dim">
                          {fmtDate(room.closedAt || room.createdAt)} · {room.transcriptCount} đoạn
                        </span>
                      </div>
                      <span className="team-history-chip">
                        {room.sourceLang.split('-')[0].toUpperCase()} ↔ {room.targetLang.split('-')[0].toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="team-history-detail">
            {selectedRoom ? (
              <>
                <div className="team-history-detail-header">
                  <div>
                    <div className="team-lobby-subtitle">
                      <History size={14} />
                      <strong>{selectedRoom.roomCode}</strong>
                    </div>
                    <div className="admin-dim">
                      {fmtDate(selectedRoom.createdAt)} → {fmtDate(selectedRoom.closedAt)} · {selectedRoom.transcriptCount} đoạn
                    </div>
                  </div>
                  <div className="team-history-chip">
                    {selectedRoom.sourceLang.split('-')[0].toUpperCase()} ↔ {selectedRoom.targetLang.split('-')[0].toUpperCase()}
                  </div>
                </div>

                <div className="team-history-detail-body">
                  {detailLoading ? (
                    <div className="admin-empty compact">
                      <Loader2 size={16} className="animate-spin" />
                      Đang tải nội dung...
                    </div>
                  ) : transcripts.length === 0 ? (
                    <div className="admin-empty compact">Phòng này chưa có transcript.</div>
                  ) : (
                    transcripts.map((item) => (
                      <div key={item.id} className="team-history-item">
                        <div className="admin-detail-stats team-history-meta">
                          <span><strong>{item.speakerName || 'Unknown speaker'}</strong></span>
                          <span className="admin-dim">{fmtDate(item.createdAt)}</span>
                          <span>{item.sourceLang} → {item.targetLang}</span>
                        </div>
                        <div className="team-history-bubble">
                          <span className="admin-dim">Gốc</span>
                          <p>{item.originalText || 'Hội thoại trống'}</p>
                        </div>
                        <div className="team-history-bubble">
                          <span className="admin-dim">Dịch</span>
                          <p>{item.translatedText || 'Hội thoại trống'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="admin-empty compact">Chọn một hội thoại để xem nội dung.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
