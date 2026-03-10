'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

type AnalysisResult = {
  subjectType: string
  gender: string
  ethnicity: string
  heightBuild: string
  headHair: string
  upperBody: string
  lowerBody: string
  footwear: string
  objects: string
  activity: string
  reportSentence: string
}

export default function SnapshotPage() {
  const { operator, loading } = useAuth()
  const router = useRouter()
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [cameraName, setCameraName] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  if (!loading && !operator) {
    router.push('/login')
    return null
  }

  const handleImageUpload = (file: File) => {
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImage(e.target?.result as string)
    reader.readAsDataURL(file)
    setResult(null)
    setError('')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleImageUpload(file)
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) handleImageUpload(file)
      }
    }
  }, [])

  const analyze = async () => {
    if (!image || !imageFile) { setError('Please upload an image first.'); return }
    setAnalyzing(true)
    setError('')
    setResult(null)
    try {
      const base64 = image.split(',')[1]
      const mediaType = imageFile.type as 'image/jpeg' | 'image/png' | 'image/webp'
      const response = await fetch('/api/analyze-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType, cameraName }),
      })
      const data = await response.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch {
      setError('Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const copyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(''), 2000)
  }

  const fullDescription = result ? `Subject Type: ${result.subjectType}
Gender: ${result.gender}
Ethnicity: ${result.ethnicity}
Height / Build: ${result.heightBuild}
Head / Hair: ${result.headHair}
Upper Body: ${result.upperBody}
Lower Body: ${result.lowerBody}
Footwear: ${result.footwear}
Objects / Items: ${result.objects}
Activity: ${result.activity}` : ''

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
        .main { flex: 1; padding: 40px 32px; max-width: 1100px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .panel { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 2px; overflow: hidden; }
        .panel-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 10px; }
        .panel-title { font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
        .panel-body { padding: 20px; }
        .drop-zone { border: 1px dashed rgba(255,255,255,0.12); border-radius: 2px; padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.02); }
        .drop-zone:hover { border-color: rgba(0,255,178,0.3); background: rgba(0,255,178,0.02); }
        .drop-zone img { max-width: 100%; max-height: 280px; border-radius: 2px; display: block; margin: 0 auto; }
        .field-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.4); display: block; margin-bottom: 8px; margin-top: 16px; }
        .field-input { width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 2px; color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 13px; outline: none; transition: border-color 0.2s; }
        .field-input:focus { border-color: rgba(0,255,178,0.4); }
        .analyze-btn { width: 100%; margin-top: 16px; padding: 12px; background: rgba(0,255,178,0.08); border: 1px solid rgba(0,255,178,0.3); border-radius: 2px; color: #00FFB2; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
        .analyze-btn:hover:not(:disabled) { background: rgba(0,255,178,0.14); box-shadow: 0 0 20px rgba(0,255,178,0.1); }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .result-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .result-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(255,255,255,0.35); letter-spacing: 0.06em; min-width: 110px; padding-top: 1px; }
        .result-value { font-size: 13px; color: #E2E8F0; line-height: 1.5; }
        .report-sentence { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #00FFB2; line-height: 1.6; padding: 12px; background: rgba(0,255,178,0.04); border: 1px solid rgba(0,255,178,0.1); border-radius: 2px; margin-top: 8px; }
        .copy-btn { padding: 7px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 2px; color: rgba(255,255,255,0.5); font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.06em; cursor: pointer; transition: all 0.2s; margin-right: 8px; margin-top: 12px; }
        .copy-btn:hover { border-color: rgba(0,255,178,0.3); color: #00FFB2; }
        .copy-btn.copied { border-color: rgba(0,255,178,0.5); color: #00FFB2; background: rgba(0,255,178,0.06); }
        .error-msg { background: rgba(255,107,53,0.08); border: 1px solid rgba(255,107,53,0.2); border-radius: 2px; padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #FF6B35; margin-top: 12px; }
        .empty-state { text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.2); font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.06em; }
        @media (max-width: 768px) { .main { grid-template-columns: 1fr; } }
      `}</style>

      <div className="grid-bg" />
      <div className="page">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="back-btn" onClick={() => router.push('/')}>← Dashboard</button>
            <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Snapshot Analyzer</span>
          </div>
          <span className="mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {operator?.name} · {operator?.operator_id}
          </span>
        </header>

        <div className="main" onPaste={handlePaste}>
          <div className="panel">
            <div className="panel-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FFB2" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span className="panel-title" style={{ color: '#00FFB2' }}>Upload Image</span>
            </div>
            <div className="panel-body">
              <div className="drop-zone" onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => document.getElementById('file-input')?.click()}>
                {image ? <img src={image} alt="uploaded" /> : (
                  <div>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📷</div>
                    <div className="mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>DRAG & DROP · CLICK TO BROWSE · CTRL+V TO PASTE</div>
                  </div>
                )}
              </div>
              <input id="file-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
              <label className="field-label">Camera Name (optional)</label>
              <input className="field-input" type="text" placeholder="e.g. Camera D10 - 1st Floor Lobby" value={cameraName} onChange={e => setCameraName(e.target.value)} />
              {error && <div className="error-msg">⚠ {error}</div>}
              <button className="analyze-btn" onClick={analyze} disabled={analyzing || !image}>
                {analyzing ? 'Analyzing...' : 'Analyze Snapshot'}
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span className="panel-title" style={{ color: '#A78BFA' }}>Analysis Results</span>
            </div>
            <div className="panel-body">
              {!result && !analyzing && <div className="empty-state">AWAITING IMAGE ANALYSIS</div>}
              {analyzing && <div className="empty-state"><div style={{ color: '#00FFB2', marginBottom: '8px' }}>ANALYZING...</div>AI is processing the image</div>}
              {result && (
                <>
                  <div className="result-row"><div className="result-label">Subject Type</div><div className="result-value">{result.subjectType}</div></div>
                  <div className="result-row"><div className="result-label">Gender</div><div className="result-value">{result.gender}</div></div>
                  <div className="result-row"><div className="result-label">Ethnicity</div><div className="result-value">{result.ethnicity}</div></div>
                  <div className="result-row"><div className="result-label">Height / Build</div><div className="result-value">{result.heightBuild}</div></div>
                  <div className="result-row"><div className="result-label">Head / Hair</div><div className="result-value">{result.headHair}</div></div>
                  <div className="result-row"><div className="result-label">Upper Body</div><div className="result-value">{result.upperBody}</div></div>
                  <div className="result-row"><div className="result-label">Lower Body</div><div className="result-value">{result.lowerBody}</div></div>
                  <div className="result-row"><div className="result-label">Footwear</div><div className="result-value">{result.footwear}</div></div>
                  <div className="result-row"><div className="result-label">Objects / Items</div><div className="result-value">{result.objects}</div></div>
                  <div className="result-row" style={{ borderBottom: 'none' }}><div className="result-label">Activity</div><div className="result-value">{result.activity}</div></div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginTop: '8px' }}>
                    <div className="result-label">Report Sentence</div>
                    <div className="report-sentence">{result.reportSentence}</div>
                  </div>
                  <div>
                    <button className={`copy-btn ${copied === 'full' ? 'copied' : ''}`} onClick={() => copyText(fullDescription, 'full')}>
                      {copied === 'full' ? '✓ Copied' : 'Copy Full'}
                    </button>
                    <button className={`copy-btn ${copied === 'sentence' ? 'copied' : ''}`} onClick={() => copyText(result.reportSentence, 'sentence')}>
                      {copied === 'sentence' ? '✓ Copied' : 'Copy Sentence'}
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