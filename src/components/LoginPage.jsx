import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
// ... (rest of state and handleLogin)
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setLoading(true);
    setError('');

    try {
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('citrus_token', data.token);
        localStorage.setItem('citrus_user', JSON.stringify({ 
          username: data.username, 
          role: data.role, 
          contactId: data.contactId 
        }));
        onLogin(data.token, data.username);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="bg-glow-orange"></div>
      <div className="bg-glow-green"></div>

      <div className="login-container glass-panel animate-slide-up">
        <div className="login-logo">
          <div className="login-logo-icon">
            🍊
          </div>
          <h1 className="login-title">Citrus World</h1>
          <p className="text-sec" style={{ fontSize: '0.9rem' }}>Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>USERNAME</label>
            <input
              type="text"
              className="ui-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="ui-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingRight: '48px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', marginTop: '8px', fontSize: '1rem' }}
            disabled={loading}
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <div className="text-muted" style={{ fontSize: '0.8rem' }}>
            Citrus World — Internal Platform
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
