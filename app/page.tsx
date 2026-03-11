'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'

export default function Dashboard() {
  const { operator, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !operator) {
      router.push('/login')
    }
  }, [operator, loading, router])

  if (loading || !operator) {
    return (
      <div style={{
        minHeight: '100vh', background: '#080B10',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace', color: 'rgba(0,255,178,0.6)', fontSize: '12px',
        letterSpacing: '0.1em'
      }}>
        LOADING...
      </div>
    )
  }

  const navItems = [
    {
      id: 'snapshot',
      label: 'Snapshot Analyzer',
      sublabel: 'AI image analysis & suspect description',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
          <path d="M6.5 3H3a1 1 0 0 0-1 1v3.5M17.5 3H21a1 1 0 0 1 1 1v3.5M21 17.5V21a1 1 0 0 1-1 1h-3.5M6.5 22H3a1 1 0 0 1-1-1v-3.5" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="3.5"/>
        </svg>
      ),
      accent: '#00FFB2',
      href: '/snapshot',
    },
    {
      id: 'report',
      label: 'Incident Report Builder',
      sublabel: 'Generate structured incident reports',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
          <path d="M14 2H6a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="8" y1="13" x2="16" y2="13" strokeLinecap="round"/>
          <line x1="8" y1="17" x2="13" y2="17" strokeLinecap="round"/>
        </svg>
      ),
      accent: '#FF6B35',
      href: '/report-builder',
    },
    {
      id: 'myreports',
      label: 'My Reports',
      sublabel: operator.role === 'team_lead' ? 'View all team reports' : 'View your submitted reports',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
          <rect x="2" y="3" width="20" height="14" rx="2" strokeLinecap="round"/>
          <path d="M8 21h8M12 17v4" strokeLinecap="round"/>
        </svg>
      ),
      accent: '#A78BFA',
      href: '/my-reports',
    },
    {
      id: 'floorplan',
      label: 'Map Reader',
      sublabel: 'Read floorplans for dispatch intelligence',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
      ),
      accent: '#38BDF8',
      href: '/floorplan',
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #080B10; font-family: 'Syne', sans-serif; color: #E2E8F0; min-height: 100vh; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .scanline {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,178,0.012) 2px, rgba(0,255,178,0.012) 4px);
          pointer-events: none; z-index: 0;
        }
        .grid-bg {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background-image: linear-gradient(rgba(0,255,178,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,178,0.04) 1px, transparent 1px);
          background-size: 40px 40px; pointer-events: none; z-index: 0;
        }
        .glow-orb {
          position: fixed; width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(0,255,178,0.06) 0%, transparent 70%);
          top: -200px; right: -200px; pointer-events: none; z-index: 0;
        }
        .card {
          background: rgba(255,255,255,0.028); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 2px; position: relative; overflow: hidden; cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); text-decoration: none;
          display: block; color: inherit;
        }
        .card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: var(--accent, #00FFB2); transform: scaleX(0); transform-origin: left;
          transition: transform 0.3s ease;
        }
        .card:hover::before { transform: scaleX(1); }
        .card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); transform: translateY(-2px); }
        .card-icon {
          width: 56px; height: 56px; border-radius: 2px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
        }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #00FFB2; animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0,255,178,0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(0,255,178,0); }
        }
        .tag {
          font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 500;
          letter-spacing: 0.08em; padding: 2px 8px; border-radius: 2px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.4);
        }
        .logout-btn {
          background: transparent; border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.4); font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: 0.1em; padding: 8px 20px; cursor: pointer;
          border-radius: 2px; transition: all 0.2s ease; text-transform: uppercase;
        }
        .logout-btn:hover { border-color: rgba(255,107,53,0.5); color: #FF6B35; background: rgba(255,107,53,0.05); }
        .role-badge {
          font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.1em;
          padding: 2px 8px; border-radius: 2px; text-transform: uppercase;
          background: rgba(0,255,178,0.1); border: 1px solid rgba(0,255,178,0.2); color: #00FFB2;
        }
      `}</style>

      <div className="scanline" />
      <div className="grid-bg" />
      <div className="glow-orb" />

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '16px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(8,11,16,0.8)', backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', background: 'rgba(0,255,178,0.1)', border: '1px solid rgba(0,255,178,0.3)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FFB2" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Keystone Dispatch Assistant</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="status-dot" />
              <span className="mono" style={{ fontSize: '11px', color: 'rgba(0,255,178,0.8)', letterSpacing: '0.05em' }}>SYSTEM NOMINAL</span>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '60px 40px', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '56px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span className="tag">OPERATOR SESSION ACTIVE</span>
              {operator.role === 'team_lead' && <span className="role-badge">Team Lead</span>}
            </div>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 8px', color: '#fff' }}>
              Welcome back,<br />
              <span style={{ color: '#00FFB2' }}>{operator.name} — {operator.operator_id}</span>
            </h1>
            <p className="mono" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', margin: 0 }}>
              Keystone Security Operations Center
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="card"
                style={{ '--accent': item.accent } as React.CSSProperties}
              >
                <div style={{ padding: '28px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <div className="card-icon" style={{ color: item.accent }}>
                      {item.icon}
                    </div>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '0.01em', marginBottom: '6px' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{item.sublabel}</div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
            <button className="logout-btn" onClick={() => { logout(); router.push('/login') }}>
              ⎋ &nbsp;Logout / End Session
            </button>
          </div>
        </main>

        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>KEYSTONE DISPATCH ASSISTANT · CLASSIFIED INTERNAL USE ONLY</span>
          <span className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>OPERATOR: {operator.operator_id} · {operator.role.toUpperCase()}</span>
        </footer>
      </div>
    </>
  )
}