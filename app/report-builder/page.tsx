'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

type ChecklistItem = {
  present: boolean
  note: string
  notRequired?: boolean
}

type Checklist = Record<string, ChecklistItem>

const REMOTE_GUARDING_CHECKLIST = [
  { id: 'activity', label: 'Activity As Seen' },
  { id: 'talkdowns', label: 'Talkdowns' },
  { id: 'confirmation_calls', label: 'Confirmation Calls' },
  { id: 'dispatch', label: 'Dispatch Call' },
  { id: 'spoc_update', label: 'SPOC Update Post-Dispatch' },
  { id: 'police_arrival', label: 'Police Arrival' },
  { id: 'followup_call', label: 'Follow-Up Call' },
  { id: 'final_status', label: 'Final Status of Subject' },
  { id: 'delay', label: 'Delay Clarification' },
]

const SCAN_CHECKLIST = [
  { id: 'activity', label: 'Activity As Seen' },
  { id: 'talkdown', label: 'Talkdown' },
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'guard_arrival', label: 'Guard Arrival' },
  { id: 'subject_status', label: 'Status of Subjects' },
  { id: 'spoc_informed', label: 'SPOC Informed' },
]

// Map checklist item IDs to the flag text they correspond to in the report
const CHECKLIST_TO_FLAG_MAP: Record<string, string[]> = {
  activity: ['time of observation', 'time of initial observation'],
  talkdowns: ['talkdown', 'talkdowns'],
  confirmation_calls: ['confirmation call', 'confirmation calls'],
  dispatch: ['Badge ID', 'Call Reference No', 'call reference number'],
  spoc_update: ['SPOC contact method', 'SPOC update'],
  police_arrival: ['police arrival', 'time of arrival'],
  followup_call: ['follow-up call', 'follow-up call details'],
  final_status: ['final status', 'subject status'],
  delay: ['delay'],
  talkdown: ['talkdown'],
  guard_arrival: ['guard arrival'],
  subject_status: ['subject status', 'status of subjects'],
  spoc_informed: ['SPOC contact method', 'SPOC informed'],
}

function extractFlags(text: string): string[] {
  const matches = text.match(/\[(?:MISSING|UNCLEAR|CONTRADICTION)[^\]]*\]/g) || []
  return [...new Set(matches)]
}

function removeFlag(text: string, flag: string): string {
  return text.replace(flag, '').replace(/\s{2,}/g, ' ').replace(/\.\s*\./g, '.').trim()
}

function removeFlagsForChecklistItem(text: string, itemId: string): string {
  const keywords = CHECKLIST_TO_FLAG_MAP[itemId] || []
  let result = text
  // Find all flags in the report and remove ones that match this checklist item
  const allFlags = text.match(/\[(?:MISSING|UNCLEAR|CONTRADICTION)[^\]]*\]/g) || []
  for (const flag of allFlags) {
    const flagLower = flag.toLowerCase()
    if (keywords.some(kw => flagLower.includes(kw.toLowerCase()))) {
      result = removeFlag(result, flag)
    }
  }
  return result
}

export default function ReportBuilderPage() {
  const { operator, loading } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'remote_guarding' | 'scan' | null>(null)
  const [notes, setNotes] = useState('')
  const [report, setReport] = useState('')
  const [dismissedFlags, setDismissedFlags] = useState<string[]>([])
  const [checklist, setChecklist] = useState<Checklist>({})
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)

  useEffect(() => {
    if (!loading && !operator) router.push('/login')
  }, [operator, loading, router])

  useEffect(() => {
    if (!mode || !notes || !operator) return
    const timer = setTimeout(async () => {
      await supabase.from('drafts').upsert({
        operator_id: operator.operator_id,
        mode,
        raw_notes: notes,
        generated_report: report,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'operator_id' })
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    }, 30000)
    return () => clearTimeout(timer)
  }, [notes, report, mode, operator])

  const generate = async () => {
    if (!notes.trim()) { setError('Please enter your incident notes.'); return }
    setGenerating(true)
    setError('')
    setDismissedFlags([])
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, mode, previousReport: report }),
      })
      const data = await response.json()
      if (data.error) { setError(data.error); return }
      setReport(data.report)
      setChecklist(data.checklist)
      setSaved(false)
    } catch {
      setError('Generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const dismissFlagInReport = (flag: string) => {
    setDismissedFlags(prev => [...prev, flag])
    setReport(prev => removeFlag(prev, flag))
  }

  const toggleNotRequired = (itemId: string, currentlyNotRequired: boolean) => {
    if (!currentlyNotRequired) {
      // Mark as not required — also remove matching flags from report
      setReport(prev => removeFlagsForChecklistItem(prev, itemId))
      // Track dismissed flags for audit log
      const allFlags = report.match(/\[(?:MISSING|UNCLEAR|CONTRADICTION)[^\]]*\]/g) || []
      const keywords = CHECKLIST_TO_FLAG_MAP[itemId] || []
      const matchingFlags = allFlags.filter(flag =>
        keywords.some(kw => flag.toLowerCase().includes(kw.toLowerCase()))
      )
      if (matchingFlags.length > 0) {
        setDismissedFlags(prev => [...prev, ...matchingFlags])
      }
    }
    setChecklist(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], notRequired: !currentlyNotRequired }
    }))
  }

  const saveReport = async () => {
    if (!report || !operator) return
    setSaving(true)
    await supabase.from('reports').insert({
      operator_id: operator.operator_id,
      operator_name: operator.name,
      mode: mode!,
      raw_notes: notes,
      generated_report: report,
    })
    setSaving(false)
    setSaved(true)
  }

  const copyReport = () => {
    navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const checklistItems = mode === 'remote_guarding' ? REMOTE_GUARDING_CHECKLIST : SCAN_CHECKLIST
  const activeFlags = extractFlags(report)
  const hasUnresolvedFlags = activeFlags.length > 0

  // All checklist items must be either present or marked not required
  const allChecklistResolved = checklistItems.every(item => {
    const status = checklist[item.id]
    return status?.present || status?.notRequired
  })

  // Copy is only enabled when no flags remain AND all checklist items resolved
  const canCopy = report.length > 0 && !hasUnresolvedFlags && allChecklistResolved
  const allFlagsResolved = report.length > 0 && !hasUnresolvedFlags

  if (!loading && !operator) return null

  if (!mode) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #080B10; font-family: 'Syne', sans-serif; color: #E2E8F0; }
          .grid-bg { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-image: linear-gradient(rgba(0,255,178,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,178,0.03) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; z-index: 0; }
        `}</style>
        <div className="grid-bg" />
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <header style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(8,11,16,0.9)' }}>
            <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono', fontSize: '11px', letterSpacing: '0.08em', padding: '7px 16px', cursor: 'pointer', borderRadius: '2px' }}>← Dashboard</button>
            <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Incident Report Builder</span>
          </header>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '24px', textTransform: 'uppercase' }}>Select Report Mode</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '600px', width: '100%' }}>
              {[
                { id: 'remote_guarding', label: 'Remote Guarding', desc: 'Full escalation with police dispatch', color: '#00FFB2' },
                { id: 'scan', label: 'Scan Monitoring', desc: 'Security guard dispatch incidents', color: '#FF6B35' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id as 'remote_guarding' | 'scan')}
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px', padding: '32px 24px', cursor: 'pointer', textAlign: 'left', color: '#E2E8F0' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = item.color }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: item.color }}>{item.label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

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
        .main { flex: 1; padding: 32px; max-width: 1300px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        .panel { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 2px; overflow: hidden; }
        .panel-header { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; }
        .panel-title { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .panel-body { padding: 20px; }
        .notes-area { width: 100%; min-height: 280px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 2px; color: #E2E8F0; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.7; padding: 14px; resize: vertical; outline: none; transition: border-color 0.2s; }
        .notes-area:focus { border-color: rgba(0,255,178,0.3); }
        .notes-area::placeholder { color: rgba(255,255,255,0.2); }
        .generate-btn { width: 100%; margin-top: 14px; padding: 12px; background: rgba(0,255,178,0.08); border: 1px solid rgba(0,255,178,0.3); border-radius: 2px; color: #00FFB2; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
        .generate-btn:hover:not(:disabled) { background: rgba(0,255,178,0.14); box-shadow: 0 0 20px rgba(0,255,178,0.1); }
        .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .report-text { font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.9; color: #E2E8F0; white-space: pre-wrap; word-break: break-word; }
        .flag-inline { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,107,53,0.1); border: 1px solid rgba(255,107,53,0.3); border-radius: 3px; padding: 1px 6px; margin: 0 2px; }
        .flag-text { color: #FF6B35; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
        .flag-dismiss { background: rgba(255,107,53,0.15); border: 1px solid rgba(255,107,53,0.4); color: #FF6B35; font-size: 9px; cursor: pointer; padding: 1px 6px; line-height: 1.4; transition: all 0.15s; font-family: 'JetBrains Mono', monospace; border-radius: 2px; letter-spacing: 0.04em; }
        .flag-dismiss:hover { background: rgba(255,107,53,0.25); border-color: rgba(255,107,53,0.7); }
        .action-btn { padding: 8px 18px; border-radius: 2px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.06em; cursor: pointer; transition: all 0.2s; border: 1px solid; }
        .copy-btn-ready { background: rgba(0,255,178,0.08); border-color: rgba(0,255,178,0.4); color: #00FFB2; }
        .copy-btn-ready:hover { background: rgba(0,255,178,0.14); box-shadow: 0 0 16px rgba(0,255,178,0.1); }
        .copy-btn-locked { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.06); color: rgba(255,255,255,0.2); cursor: not-allowed; }
        .error-msg { background: rgba(255,107,53,0.08); border: 1px solid rgba(255,107,53,0.2); border-radius: 2px; padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #FF6B35; margin-top: 12px; }
        .mode-badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 2px; text-transform: uppercase; }
        .resolved-banner { background: rgba(0,255,178,0.06); border: 1px solid rgba(0,255,178,0.2); border-radius: 2px; padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #00FFB2; margin-bottom: 16px; }
        .pending-banner { background: rgba(255,107,53,0.06); border: 1px solid rgba(255,107,53,0.2); border-radius: 2px; padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #FF6B35; margin-bottom: 16px; }
        .not-required-btn { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.06em; padding: 3px 10px; border-radius: 2px; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .not-required-btn.active { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.4); }
        .not-required-btn.inactive { background: rgba(255,107,53,0.08); border: 1px solid rgba(255,107,53,0.35); color: #FF6B35; }
        .not-required-btn.inactive:hover { background: rgba(255,107,53,0.15); border-color: rgba(255,107,53,0.6); }
        @media (max-width: 768px) { .main { grid-template-columns: 1fr; } }
      `}</style>

      <div className="grid-bg" />
      <div className="page">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="back-btn" onClick={() => setMode(null)}>← Change Mode</button>
            <button className="back-btn" onClick={() => router.push('/')}>Dashboard</button>
            <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Report Builder</span>
            <span className="mode-badge" style={{
              background: mode === 'remote_guarding' ? 'rgba(0,255,178,0.1)' : 'rgba(255,107,53,0.1)',
              border: `1px solid ${mode === 'remote_guarding' ? 'rgba(0,255,178,0.3)' : 'rgba(255,107,53,0.3)'}`,
              color: mode === 'remote_guarding' ? '#00FFB2' : '#FF6B35'
            }}>
              {mode === 'remote_guarding' ? 'Remote Guarding' : 'Scan Monitoring'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {draftSaved && <span className="mono" style={{ fontSize: '10px', color: 'rgba(0,255,178,0.6)' }}>✓ Draft Saved</span>}
            <span className="mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{operator?.name} · {operator?.operator_id}</span>
          </div>
        </header>

        <div className="main">
          {/* LEFT - Notes + Checklist */}
          <div>
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title" style={{ color: '#00FFB2' }}>Incident Notes</span>
                <span className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>Typos OK · First person OK</span>
              </div>
              <div className="panel-body">
                <textarea
                  className="notes-area"
                  placeholder={mode === 'remote_guarding'
                    ? `Paste your rough notes here. Example:\n\nsaw guy jumping fence at camera d10, did 2 talkdowns no response, called sapd badge 1234 ref 5678, called ryan and veronica on spoc list, cops showed up around 18:21 mst, guy got detained, called back at 19:00 talked to cassey disposition detained escorted off`
                    : `Paste your rough notes here. Example:\n\nsaw someone dumping trash at camera lobby 01 at 15:15, did talkdown, called guard company they sent mike badge 234, guard arrived and subject left before guard got there, called spoc john via phone`
                  }
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                {error && <div className="error-msg">⚠ {error}</div>}
                <button className="generate-btn" onClick={generate} disabled={generating}>
                  {generating ? 'Generating Report...' : report ? 'Regenerate Report' : 'Generate Report'}
                </button>
              </div>
            </div>

            {/* Checklist */}
            {Object.keys(checklist).length > 0 && (
              <div className="panel" style={{ marginTop: '16px' }}>
                <div className="panel-header">
                  <span className="panel-title" style={{ color: '#A78BFA' }}>Report Checklist</span>
                  <span className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                    {checklistItems.filter(item => checklist[item.id]?.present || checklist[item.id]?.notRequired).length}/{checklistItems.length} resolved
                  </span>
                </div>
                <div style={{ padding: '8px 20px 16px' }}>
                  {checklistItems.map(item => {
                    const status = checklist[item.id]
                    const isPresent = status?.present
                    const isNotRequired = status?.notRequired
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '2px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, marginTop: '2px',
                          background: isPresent ? 'rgba(0,255,178,0.15)' : isNotRequired ? 'rgba(255,255,255,0.05)' : 'rgba(255,107,53,0.1)',
                          border: `1px solid ${isPresent ? 'rgba(0,255,178,0.4)' : isNotRequired ? 'rgba(255,255,255,0.15)' : 'rgba(255,107,53,0.3)'}`
                        }}>
                          <span style={{ fontSize: '9px', color: isPresent ? '#00FFB2' : isNotRequired ? 'rgba(255,255,255,0.3)' : '#FF6B35' }}>
                            {isPresent ? '✓' : isNotRequired ? '—' : '✗'}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: isPresent ? '#E2E8F0' : isNotRequired ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)' }}>
                              {item.label}
                            </span>
                            {!isPresent && (
                              <button
                                className={`not-required-btn ${isNotRequired ? 'active' : 'inactive'}`}
                                onClick={() => toggleNotRequired(item.id, !!isNotRequired)}
                              >
                                {isNotRequired ? '↩ Undo' : 'Not Required'}
                              </button>
                            )}
                          </div>
                          {status?.note && (
                            <div className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{status.note}</div>
                          )}
                          {isNotRequired && (
                            <div className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>Not required as per SOP</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT - Generated Report */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title" style={{ color: '#FF6B35' }}>Generated Report</span>
              {report && !generating && (
                canCopy
                  ? <span className="mono" style={{ fontSize: '10px', color: '#00FFB2' }}>✓ Ready to copy</span>
                  : <span className="mono" style={{ fontSize: '10px', color: '#FF6B35' }}>Resolve all flags to enable copy</span>
              )}
            </div>
            <div className="panel-body">
              {!report && !generating && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono', fontSize: '11px', letterSpacing: '0.06em' }}>
                  AWAITING NOTES
                </div>
              )}
              {generating && (
                <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: 'JetBrains Mono', fontSize: '11px', letterSpacing: '0.06em' }}>
                  <div style={{ color: '#00FFB2', marginBottom: '8px' }}>GENERATING...</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)' }}>AI is writing your report</div>
                </div>
              )}
              {report && !generating && (
                <>
                  {canCopy ? (
                    <div className="resolved-banner">✓ All fields resolved — report is clean and ready to copy</div>
                  ) : (
                    <div className="pending-banner">
                      {hasUnresolvedFlags
                        ? `${activeFlags.length} flag${activeFlags.length > 1 ? 's' : ''} in report — dismiss each or mark checklist item as Not Required`
                        : 'Mark remaining checklist items as Not Required to enable copy'
                      }
                    </div>
                  )}

                  <div className="report-text">
                    {report.split(/(\[(?:MISSING|UNCLEAR|CONTRADICTION)[^\]]*\])/g).map((part, i) => {
                      if (part.match(/^\[(?:MISSING|UNCLEAR|CONTRADICTION)/)) {
                        return (
                          <span key={i} className="flag-inline">
                            <span className="flag-text">{part}</span>
                            <button className="flag-dismiss" onClick={() => dismissFlagInReport(part)}>
                              ✕ Not Required
                            </button>
                          </span>
                        )
                      }
                      return <span key={i}>{part}</span>
                    })}
                  </div>

                  {dismissedFlags.length > 0 && (
                    <div style={{ marginTop: '16px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                      <div className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '6px', letterSpacing: '0.06em' }}>MARKED NOT REQUIRED:</div>
                      {dismissedFlags.map((f, i) => (
                        <div key={i} className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
                          — {f.replace('[MISSING:', '').replace(']', '').trim()}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <button
                      className={`action-btn ${canCopy ? 'copy-btn-ready' : 'copy-btn-locked'}`}
                      onClick={canCopy ? copyReport : undefined}
                      disabled={!canCopy}
                      title={canCopy ? 'Copy report to clipboard' : 'Resolve all flags and checklist items first'}
                    >
                      {copied ? '✓ Copied' : canCopy ? 'Copy Report' : '🔒 Copy Locked'}
                    </button>
                    <button
                      className="action-btn"
                      onClick={saveReport}
                      disabled={saving || saved}
                      style={{
                        background: saved ? 'rgba(0,255,178,0.08)' : 'transparent',
                        borderColor: saved ? 'rgba(0,255,178,0.4)' : 'rgba(255,255,255,0.1)',
                        color: saved ? '#00FFB2' : 'rgba(255,255,255,0.5)'
                      }}
                    >
                      {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Report'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}