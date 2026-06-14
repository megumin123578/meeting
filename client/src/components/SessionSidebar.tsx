import React, { useState } from 'react';
import { Plus, Check, X, Pencil, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { SessionMeta } from '../hooks/useSessions';

interface SessionSidebarProps {
  sessions: SessionMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const startEdit = (s: SessionMeta) => {
    setEditingId(s.id);
    setDraft(s.title);
  };

  const commitEdit = () => {
    if (editingId && draft.trim()) onRename(editingId, draft);
    setEditingId(null);
    setDraft('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };

  return (
    <div className={`session-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="session-sidebar-header">
        {!collapsed && (
          <button className="btn btn-primary session-new-btn" onClick={onCreate} title="Tạo phiên mới">
            <Plus size={14} />
            <span>Phiên mới</span>
          </button>
        )}
        <button
          className="session-icon-btn session-toggle-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Mở danh sách phiên' : 'Thu gọn danh sách phiên'}
          aria-label={collapsed ? 'Mở danh sách phiên' : 'Thu gọn danh sách phiên'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="session-list">
          {sessions.length === 0
            ? null
            : sessions.map((s) => {
                const isActive = s.id === activeId;
                const isEditing = s.id === editingId;
                return (
                  <div
                    key={s.id}
                    className={`session-item ${isActive ? 'active' : ''}`}
                    onClick={() => !isEditing && onSelect(s.id)}
                  >
                    {isEditing ? (
                      <div className="session-edit-row" onClick={(e) => e.stopPropagation()}>
                        <input
                          className="input-control session-edit-input"
                          value={draft}
                          autoFocus
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <button className="session-icon-btn" onClick={commitEdit} title="Lưu">
                          <Check size={13} />
                        </button>
                        <button className="session-icon-btn" onClick={cancelEdit} title="Huỷ">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="session-item-main">
                          <span className="session-item-title">{s.title}</span>
                          <span className="session-item-meta font-mono">
                            {s.count} đoạn · {formatDate(s.createdAt)}
                          </span>
                        </div>
                        <div className="session-item-actions">
                          <button
                            className="session-icon-btn"
                            title="Đổi tên"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(s);
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="session-icon-btn session-icon-danger"
                            title="Xoá phiên"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Xoá phiên "${s.title}" và toàn bộ nội dung của nó?`)) {
                                onDelete(s.id);
                              }
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
        </div>
      )}
    </div>
  );
};
