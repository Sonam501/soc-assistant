'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const [operatorId, setOperatorId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleLogin = async () => {
    if (!operatorId || !password) {
      setError('Please enter your Operator ID and password.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await login(operatorId.trim(), password.trim())
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080B10; }
        .grid-bg {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background-image:
            linear-gradient(rgba(0,255,178,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,178,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none; z-index: 0;
        }
        .scanline {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0,255,178,0.01) 2px, rgba(0,255,178,0.01) 4px
          );
          pointer-events: none; z-index: 0;
        }
        .login-container {
          position: relative; z-index: 1;
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif;
          padding: 20px;
        }
        .login-box {
          width: 100%; max-width: 860px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 2px;
          overflow: hidden;
        }
        .login-header {
          padding: 28px 32px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(0,255,178,0.03);
        }
        .login-logo {
          display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
        }
        .login-logo-icon {
          width: 32px; height: 32px;
          background: rgba(0,255,178,0.1);
          border: 1px solid rgba(0,255,178,0.3);
          border-radius: 2px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .login-title {
          font-size: 22px; font-weight: 800;
          letter-spacing: -0.01em; color: #fff;
        }
        .login-subtitle {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; color: rgba(255,255,255,0.3);
          letter-spacing: 0.06em; text-transform: uppercase;
        }
        .login-body { padding: 28px 32px; }
        .field { margin-bottom: 18px; }
        .field-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; letter-spacing: 0.1em;
          text-transform: uppercase; color: rgba(255,255,255,0.4);
          display: block; margin-bottom: 8px;
        }
        .field-input {
          width: 100%; padding: 11px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 2px;
          color: #fff; font-family: 'JetBrains Mono', monospace;
          font-size: 14px; letter-spacing: 0.04em;
          outline: none; transition: border-color 0.2s;
        }
        .field-input:focus {
          border-color: rgba(0,255,178,0.4);
          background: rgba(0,255,178,0.03);
        }
        .field-input::placeholder { color: rgba(255,255,255,0.2); }
        .error-msg {
          background: rgba(255,107,53,0.08);
          border: 1px solid rgba(255,107,53,0.2);
          border-radius: 2px; padding: 10px 14px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; color: #FF6B35;
          letter-spacing: 0.04em; margin-bottom: 18px;
        }
        .login-btn {
          width: 100%; padding: 13px;
          background: rgba(0,255,178,0.08);
          border: 1px solid rgba(0,255,178,0.3);
          border-radius: 2px; color: #00FFB2;
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          cursor: pointer; transition: all 0.2s;
        }
        .login-btn:hover:not(:disabled) {
          background: rgba(0,255,178,0.14);
          border-color: rgba(0,255,178,0.6);
          box-shadow: 0 0 20px rgba(0,255,178,0.1);
        }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .login-footer {
          padding: 16px 32px;
          border-top: 1px solid rgba(255,255,255,0.04);
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; color: rgba(255,255,255,0.15);
          letter-spacing: 0.06em; text-align: center;
        }
      `}</style>

      <div className="grid-bg" />
      <div className="scanline" />

      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <div className="login-logo">
              <div className="login-logo-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FFB2" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', whiteSpace: 'nowrap' }}>
                Keystone Dispatch Assistant
              </span>
            </div>
            <h1 className="login-title">Operator Login</h1>
            <p className="login-subtitle">Keystone Security Operations Center</p>
          </div>

          <div className="login-body">
            <div className="field">
              <label className="field-label">Operator ID</label>
              <input
                className="field-input"
                type="text"
                placeholder="e.g. 4102"
                value={operatorId}
                onChange={e => setOperatorId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div className="field">
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {error && <div className="error-msg">⚠ {error}</div>}

            <button
              className="login-btn"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Login to Keystone Dispatch Assistant'}
            </button>
          </div>

          <div className="login-footer">
            CLASSIFIED · AUTHORIZED PERSONNEL ONLY
          </div>
        </div>
      </div>
    </>
  )
}