import React, { useCallback, useEffect, useState } from 'react';
import { X, RefreshCw, Trash2, KeyRound, UserPlus, ShieldCheck, Loader2 } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';

export interface AdminUser {
  id: string;
  username: string;
  createdAt: string;
  model: string;
  hasApiKey: boolean;
  sessionCount: number;
  transcriptCount: number;
  isAdmin: boolean;
  role: 'admin' | 'user';
}

interface AdminDashboardProps {
  token: string;
  currentUserId: string;
  onClose: () => void;
  onShowToast: (message: string) => void;
  variant?: 'modal' | 'page';
}

const fmtDate = (iso: string) => {
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

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  currentUserId,
  onClose,
  onShowToast,
  variant = 'modal',
}) => {
  const confirm = useConfirm();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create-user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const authHeaders = useCallback(
    (json = false): Record<string, string> => {
      const h: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (json) h['Content-Type'] = 'application/json';
      return h;
    },
    [token]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders() });
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      onShowToast('❌ Không tải được danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, onShowToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Tạo user thất bại.');
      setUsers((prev) => [...prev, data.user]);
      setNewUsername('');
      setNewPassword('');
      onShowToast(`✅ Đã tạo người dùng "${data.user.username}".`);
    } catch (err: any) {
      onShowToast(`❌ ${err.message || 'Tạo user thất bại.'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    const ok = await confirm({
      title: 'Xoá người dùng',
      message: `Xoá "${u.username}" và toàn bộ phiên/đoạn dịch của họ? Hành động này không thể hoàn tác.`,
      danger: true,
      confirmText: 'Xoá',
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Xoá thất bại.');
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      onShowToast(`🗑️ Đã xoá "${u.username}".`);
    } catch (err: any) {
      onShowToast(`❌ ${err.message || 'Xoá thất bại.'}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async (u: AdminUser) => {
    const pwd = window.prompt(`Mật khẩu mới cho "${u.username}" (tối thiểu 6 ký tự):`);
    if (pwd === null) return;
    if (pwd.length < 6) {
      onShowToast('❌ Password tối thiểu 6 ký tự.');
      return;
    }
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/reset-password`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ password: pwd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Đặt lại mật khẩu thất bại.');
      onShowToast(`🔑 Đã đặt lại mật khẩu cho "${u.username}".`);
    } catch (err: any) {
      onShowToast(`❌ ${err.message || 'Đặt lại mật khẩu thất bại.'}`);
    } finally {
      setBusyId(null);
    }
  };

  const dashboard = (
    <div
      className={`admin-dash ${variant === 'page' ? 'admin-dash-page' : ''}`}
      role={variant === 'modal' ? 'dialog' : 'main'}
      aria-modal={variant === 'modal' ? 'true' : undefined}
      aria-label="Quản trị người dùng"
      onClick={variant === 'modal' ? (e) => e.stopPropagation() : undefined}
    >
      <div className="admin-dash-header">
        <h2>
          <ShieldCheck size={18} className="logo-icon" />
          Quản trị người dùng
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="topbar-icon-btn" onClick={loadUsers} title="Tải lại" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="topbar-icon-btn" onClick={onClose} title="Đóng">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Create user */}
      <form className="admin-create-row" onSubmit={handleCreate}>
        <input
          className="input-control"
          placeholder="Tên đăng nhập mới"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          autoComplete="off"
        />
        <input
          className="input-control"
          type="password"
          placeholder="Mật khẩu (≥ 6 ký tự)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Tạo
        </button>
      </form>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">
            <Loader2 size={20} className="animate-spin" /> Đang tải...
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty">Chưa có người dùng nào.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Tạo lúc</th>
                <th className="num">Phiên</th>
                <th className="num">Đoạn dịch</th>
                <th>API key</th>
                <th className="actions-col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                const locked = u.isAdmin || isSelf;
                return (
                  <tr key={u.id}>
                    <td>
                      <span className="admin-uname">
                        {u.username}
                        {isSelf && <span className="admin-badge self">bạn</span>}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${u.isAdmin ? '' : 'user'}`}>
                        {u.role === 'admin' ? 'admin' : 'user'}
                      </span>
                    </td>
                    <td className="font-mono admin-dim">{fmtDate(u.createdAt)}</td>
                    <td className="num">{u.sessionCount}</td>
                    <td className="num">{u.transcriptCount}</td>
                    <td>{u.hasApiKey ? '✓' : '—'}</td>
                    <td className="actions-col">
                      <button
                        className="icon-action"
                        title="Đặt lại mật khẩu"
                        onClick={() => handleResetPassword(u)}
                        disabled={busyId === u.id}
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        className="icon-action danger"
                        title={locked ? 'Không thể xoá tài khoản này' : 'Xoá người dùng'}
                        onClick={() => handleDelete(u)}
                        disabled={locked || busyId === u.id}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  if (variant === 'page') {
    return dashboard;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      {dashboard}
    </div>
  );
};
