'use client'
import { useRef, useState, useCallback } from 'react'
import { Player, PlayerRef } from '@remotion/player'
import { JobVideoComposition, type JobVideoProps } from '@/remotion/JobVideoComposition'

interface JobVideoPlayerProps {
  props: JobVideoProps
  onVideoSaved?: (url: string) => void
}

export default function JobVideoPlayer({ props, onVideoSaved }: JobVideoPlayerProps) {
  const playerRef = useRef<PlayerRef>(null)
  const [recording, setRecording] = useState(false)
  const [progress, setProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [format, setFormat] = useState<'square' | 'story'>('square')

  const exportVideo = useCallback(async () => {
    const player = playerRef.current
    if (!player) return
    setRecording(true)
    setProgress(0)
    setVideoUrl(null)

    try {
      const canvas = document.querySelector('.remotion-player canvas') as HTMLCanvasElement
      if (!canvas) { setRecording(false); return }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'

      const stream = canvas.captureStream(30)
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 })
      const chunks: Blob[] = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setVideoUrl(url)
        setRecording(false)
        setProgress(100)
        onVideoSaved?.(url)
      }

      recorder.start()
      player.seekTo(0)
      player.play()

      const totalFrames = 150
      const interval = setInterval(() => {
        try {
          const frame = player.getCurrentFrame()
          setProgress(Math.round((frame / totalFrames) * 100))
          if (frame >= totalFrames - 2) {
            clearInterval(interval)
            player.pause()
            setTimeout(() => recorder.stop(), 200)
          }
        } catch { clearInterval(interval) }
      }, 100)

    } catch (e) {
      console.error('Export error:', e)
      setRecording(false)
    }
  }, [onVideoSaved])

  const w = format === 'story' ? 270 : 400
  const h = format === 'story' ? 480 : 400
  const cW = format === 'story' ? 1080 : 1080
  const cH = format === 'story' ? 1920 : 1080

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['square', 'story'] as const).map(f => (
          <button key={f} onClick={() => setFormat(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${format === f ? 'border-[#c8a96e] bg-[#c8a96e]/10' : 'border-zinc-100 text-zinc-400'}`}>
            {f === 'square' ? '□ Carré 1:1' : '▯ Story 9:16'}
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden bg-[#1a1918] flex items-center justify-center" style={{ minHeight: h + 20 }}>
        <Player ref={playerRef} component={JobVideoComposition} inputProps={props}
          durationInFrames={150} compositionWidth={cW} compositionHeight={cH} fps={30}
          style={{ width: w, height: h }} controls loop
          className="remotion-player" />
      </div>

      <div className="flex gap-2">
        <button onClick={() => void exportVideo()} disabled={recording}
          className="flex-1 py-2 text-xs font-bold bg-[#1a1918] text-[#c8a96e] rounded-xl hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {recording ? (
            <><span className="w-3 h-3 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />{progress}%</>
          ) : '🎬 Exporter .webm'}
        </button>
        {videoUrl && (
          <a href={videoUrl} download={`job_video_${Date.now()}.webm`}
            className="px-3 py-2 text-xs font-bold bg-green-600 text-white rounded-xl hover:bg-green-700">
            ↓ DL
          </a>
        )}
      </div>

      {recording && (
        <div className="w-full bg-zinc-100 rounded-full h-1">
          <div className="bg-[#c8a96e] h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="text-[10px] text-zinc-400 text-center">Rendu navigateur · 0€ · WebM compatible partout</p>
    </div>
  )
}
