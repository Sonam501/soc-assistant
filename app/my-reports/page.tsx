'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

type Report = {
  id: string
  operator_id: string
  operator_name: string
  mode: 'remote_guarding' | 'scan'
  raw_notes: string
  generated_report: string
  created_at: string
}

export default function MyReportsPage() {
  const { operator, loading } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [fetching, setFetching] = useState(true)
  const [selected, setSelected] = useState<Report | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!loading && !operator) { router.push('/login'); return }
    if (operator) fetchReports()
  }, [operator, loading])

  const fetchReports = async () => {
    setFetching(true)
    let query = supabase.from('reports').select('*').order('created_at', { ascending: false })
    if (operator!.role !== 'team_lead') {
      query = query.eq('operator_id', operator!.operator_id)
    }
    const { data } = await query
    setReports(data || [])
    setFetching(false)
  }

  const copyReport = () => {
    if (!selected) return
    navigator.clipboard.writeText(selected.generated_report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    })
  }

  const hasFlags = (text: string) =>
    text.includes('[MISSING:') || text.includes('[UNCLEAR') || text.includes('[CONTRADICTION')

  if (!loading && !operator) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080B10; font-family: 'Syne', sans-serif; color: #E2E8F0; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .grid-bg { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-image: linear-gradient(rgba(0,255,178,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,178,0.03) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; z-index: 0; }
        .page { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; }
        .header { border-bottom: 1px solid rgba(255,255,255,0.05); padding: 14px 32px; display: flex; align-items: center; justify-content: space-between; background: rgba(8,11,16,0.9); position: sticky; top: 0; z-index: 10; }
        .back-btn { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.08em; padding: 7px 16px; cursor: pointer; border-radius: 2px; transition: all 0.2s; }
        .back-btn:hover { border-color: rgba(0,255,178,0.4); color: #00FFB2; }
        .main { flex: 1; padding: 32px; max-width: 1200px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: 340px 1fr; gap: 24px; align-items: start; }
        .panel { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 2px; overflow: hidden; }
        .panel-header { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; }
        .panel-title { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .report-item { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; transition: background 0.15s; }
        .report-item:hover { background: rgba(255,255,255,0.03); }
        .report-item.active { background: rgba(0,255,178,0.04); border-left: 2px solid #00FFB2; }
        .mode-badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.08em; padding: 2px 7px; border-radius: 2px; text-transform: uppercase; }
        .report-text { font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.8; color: #E2E8F0; white-space: pre-wrap; word-break: break-word; padding: 20px; }
        .flag { color: #FF6B35; background: rgba(255,107,53,0.08); border-radius: 2px; padding: 1px 4px; }
        .action-btn { padding: 8px 18px; border-radius: 2px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.06em; cursor: pointer; transition: all 0.2s; border: 1px solid; }
        .empty-state { text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.2); font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.06em; }
        @media (max-width: 768px) { .main { grid-template-columns: 1fr; } }
      `}</style>

      <div className="grid-bg" />
      <div className="page">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="back-btn" onClick={() => router.push('/')}>← Dashboard</button>
            <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>My Reports</span>
            {operator?.role === 'team_lead' && (
              <span className="mono" style={{ fontSize: '10px', color: 'rgba(0,255,178,0.6)', background: 'rgba(0,255,178,0.08)', border: '1px solid rgba(0,255,178,0.2)', padding: '2px 8px', borderRadius: '2px' }}>
                ALL TEAM REPORTS
              </span>
            )}
          </div>
          <span className="mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {operator?.name} · {operator?.operator_id}
          </span>
        </header>

        <div className="main">
          {/* Left - Report List */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title" style={{ color: '#A78BFA' }}>Reports</span>
              <span className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{reports.length} total</span>
            </div>
            {fetching ? (
              <div className="empty-state">LOADING...</div>
            ) : reports.length === 0 ? (
              <div className="empty-state">NO REPORTS YET</div>
            ) : (
              reports.map(r => (
                <div
                  key={r.id}
                  className={`report-item ${selected?.id === r.id ? 'active' : ''}`}
                  onClick={() => setSelected(r)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span className="mode-badge" style={{
                      background: r.mode === 'remote_guarding' ? 'rgba(0,255,178,0.1)' : 'rgba(255,107,53,0.1)',
                      border: `1px solid ${r.mode === 'remote_guarding' ? 'rgba(0,255,178,0.25)' : 'rgba(255,107,53,0.25)'}`,
                      color: r.mode === 'remote_guarding' ? '#00FFB2' : '#FF6B35'
                    }}>
                      {r.mode === 'remote_guarding' ? 'Remote' : 'Scan'}
                    </span>
                    {hasFlags(r.generated_report) && (
                      <span className="mono" style={{ fontSize: '9px', color: '#FF6B35' }}>⚠ flags</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#E2E8F0', marginBottom: '4px', fontWeight: 600 }}>
                    {r.generated_report.slice(0, 60)}...
                  </div>
                  <div className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                    {operator?.role === 'team_lead' && r.operator_name && (
                      <span style={{ color: 'rgba(0,255,178,0.5)', marginRight: '8px' }}>{r.operator_name} · {r.operator_id}</span>
                    )}
                    {formatDate(r.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right - Report Detail */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title" style={{ color: '#FF6B35' }}>Report Detail</span>
              {selected && hasFlags(selected.generated_report) && (
                <span className="mono" style={{ fontSize: '10px', color: '#FF6B35' }}>⚠ Contains unresolved flags</span>
              )}
            </div>
            {!selected ? (
              <div className="empty-state">SELECT A REPORT TO VIEW</div>
            ) : (
              <>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span className="mode-badge" style={{
                    background: selected.mode === 'remote_guarding' ? 'rgba(0,255,178,0.1)' : 'rgba(255,107,53,0.1)',
                    border: `1px solid ${selected.mode === 'remote_guarding' ? 'rgba(0,255,178,0.25)' : 'rgba(255,107,53,0.25)'}`,
                    color: selected.mode === 'remote_guarding' ? '#00FFB2' : '#FF6B35',
                    fontSize: '10px', padding: '3px 10px'
                  }}>
                    {selected.mode === 'remote_guarding' ? 'Remote Guarding' : 'Scan Monitoring'}
                  </span>
                  <span className="mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    {formatDate(selected.created_at)}
                  </span>
                  {operator?.role === 'team_lead' && (
                    <span className="mono" style={{ fontSize: '11px', color: 'rgba(0,255,178,0.6)' }}>
                      {selected.operator_name} · {selected.operator_id}
                    </span>
                  )}
                </div>
                <div className="report-text">
                  {selected.generated_report.split(/(\[MISSING:[^\]]*\]|\[UNCLEAR[^\]]*\]|\[CONTRADICTION[^\]]*\])/g).map((part, i) =>
                    part.match(/^\[(MISSING|UNCLEAR|CONTRADICTION)/)
                      ? <span key={i} className="flag">{part}</span>
                      : <span key={i}>{part}</span>
                  )}
                </div>
                <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px' }}>
                  <button
                    className="action-btn"
                    onClick={copyReport}
                    style={{ background: copied ? 'rgba(0,255,178,0.08)' : 'transparent', borderColor: copied ? 'rgba(0,255,178,0.4)' : 'rgba(255,255,255,0.1)', color: copied ? '#00FFB2' : 'rgba(255,255,255,0.5)' }}
                  >
                    {copied ? '✓ Copied' : 'Copy Report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}