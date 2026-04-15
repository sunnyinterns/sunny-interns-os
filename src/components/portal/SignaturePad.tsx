'use client'
import { useRef, useState, useEffect } from 'react'

interface Props {
  onSign: (data: string) => void
  label?: string
  disabled?: boolean
}

type Tab = 'draw' | 'upload'

export function SignaturePad({ onSign, label = 'Votre signature', disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tab, setTab] = useState<Tab>('draw')
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1a1918'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [tab])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    setDrawing(true)
    lastPos.current = getPos(e, canvas)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing || disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    if (lastPos.current) {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      setHasDrawn(true)
    }
    lastPos.current = pos
  }

  function endDraw() {
    setDrawing(false)
    lastPos.current = null
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  function confirmDraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    onSign(canvas.toDataURL('image/png'))
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result as string
      setUploadPreview(data)
    }
    reader.readAsDataURL(file)
  }

  function confirmUpload() {
    if (uploadPreview) onSign(uploadPreview)
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 16px',
    border: 'none',
    borderBottom: tab === t ? '2px solid #c8a96e' : '2px solid transparent',
    background: 'none',
    color: tab === t ? '#c8a96e' : '#6b7280',
    fontWeight: tab === t ? 600 : 400,
    cursor: 'pointer',
    fontSize: '13px',
  })

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px 0', borderBottom: '1px solid #e5e7eb', background: '#fafaf9' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '8px' }}>{label}</p>
        <div style={{ display: 'flex', gap: '0' }}>
          <button style={tabStyle('draw')} onClick={() => setTab('draw')}>✏️ Dessiner</button>
          <button style={tabStyle('upload')} onClick={() => setTab('upload')}>📎 Upload PNG</button>
        </div>
      </div>

      <div style={{ padding: '16px', background: 'white' }}>
        {tab === 'draw' && (
          <div>
            <div style={{ position: 'relative', border: '1px dashed #d1d5db', borderRadius: '8px', background: '#fafaf9', marginBottom: '12px' }}>
              <canvas
                ref={canvasRef}
                width={560}
                height={120}
                style={{ width: '100%', height: '120px', display: 'block', cursor: disabled ? 'not-allowed' : 'crosshair', touchAction: 'none' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {!hasDrawn && (
                <p style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#d1d5db', fontSize: '13px', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                  Signez ici avec votre souris ou votre doigt
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={clearCanvas}
                style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}
              >
                Recommencer
              </button>
              <button
                onClick={confirmDraw}
                disabled={!hasDrawn || disabled}
                style={{ flex: 1, padding: '8px', background: hasDrawn && !disabled ? '#c8a96e' : '#e5e7eb', color: hasDrawn && !disabled ? 'white' : '#9ca3af', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: hasDrawn && !disabled ? 'pointer' : 'not-allowed' }}
              >
                Valider ma signature
              </button>
            </div>
          </div>
        )}
        {tab === 'upload' && (
          <div>
            <label style={{ display: 'block', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#fafaf9', marginBottom: '12px' }}>
              <input type="file" accept="image/png,image/jpeg" onChange={handleUpload} style={{ display: 'none' }} />
              {uploadPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={uploadPreview} alt="signature" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
              ) : (
                <div>
                  <p style={{ fontSize: '24px', marginBottom: '8px' }}>📎</p>
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>Cliquer pour uploader une image PNG/JPG de ta signature</p>
                </div>
              )}
            </label>
            {uploadPreview && (
              <button
                onClick={confirmUpload}
                disabled={disabled}
                style={{ width: '100%', padding: '8px', background: '#c8a96e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Valider ma signature
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
