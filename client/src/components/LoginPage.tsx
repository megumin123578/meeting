import React, { useState } from 'react';
import { Sparkles, LogIn, UserPlus, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ username và password.');
      return;
    }
    if (mode === 'register') {
      if (password.length < 6) {
        setError('Password tối thiểu 6 ký tự.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Xác nhận password không khớp.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') await onLogin(username.trim(), password);
      else await onRegister(username.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
  };

  return (
    <div className="login-shell">
      <div className="login-card panel-card">
        <div className="login-brand">
          <Sparkles size={32} className="logo-icon" />
          <h1 className="app-title" style={{ fontSize: '1.5rem' }}>SpeakLink</h1>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            <LogIn size={14} /> Đăng nhập
          </button>
          <button
            type="button"
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            <UserPlus size={14} /> Đăng ký
          </button>
        </div>

        <form onSubmit={submit} className="login-form">
          <div className="input-group">
            <label className="input-label">Username</label>
            <input
              type="text"
              className="input-control"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input-control"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          {mode === 'register' && (
            <div className="input-group">
              <label className="input-label">Xác nhận password</label>
              <input
                type="password"
                className="input-control"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
          )}

          {error && (
            <div
              className="font-mono"
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-error)',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
              }}
            >
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>

        <p className="login-hint font-mono">
          {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
          <button
            type="button"
            className="login-link"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </p>
      </div>
    </div>
  );
};
