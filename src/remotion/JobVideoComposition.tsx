import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile } from 'remotion'

export interface JobVideoProps {
  title: string
  company: string
  location: string
  duration: string
  hook: string
  perks: string[]
  coverImageUrl?: string
  logoUrl?: string
  brandColor?: string
}

function Counter({ from, to, delay = 0 }: { from: number; to: number; delay?: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({ frame: frame - delay, fps, config: { damping: 30, stiffness: 120 } })
  const value = Math.round(interpolate(progress, [0, 1], [from, to]))
  return <>{value}</>
}

export function JobVideoComposition({
  title, company, location, duration, hook, perks,
  coverImageUrl, logoUrl, brandColor = '#F5A623',
}: JobVideoProps) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Animations
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
  const titleY = interpolate(frame, [0, 20], [30, 0], { extrapolateRight: 'clamp' })
  const hookOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' })
  const hookY = interpolate(frame, [20, 40], [20, 0], { extrapolateRight: 'clamp' })
  const perksOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' })
  const ctaOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: 'clamp' })

  // Perk stagger
  const getPerkProgress = (i: number) => interpolate(
    frame, [40 + i * 8, 58 + i * 8], [0, 1], { extrapolateRight: 'clamp' }
  )

  return (
    <AbsoluteFill style={{ fontFamily: "'Sora', 'DM Sans', sans-serif", backgroundColor: '#1a1918' }}>
      {/* Background image */}
      {coverImageUrl && (
        <AbsoluteFill>
          <Img src={coverImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />
        </AbsoluteFill>
      )}

      {/* Gradient overlay */}
      <AbsoluteFill style={{
        background: `linear-gradient(160deg, ${brandColor}22 0%, #1a191888 40%, #1a1918ee 100%)`
      }} />

      {/* Content */}
      <AbsoluteFill style={{ padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Top: Logo + Company */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {logoUrl ? (
            <Img src={logoUrl} style={{ height: 36, objectFit: 'contain' }} />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: brandColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1a1918', fontWeight: 900, fontSize: 18
            }}>B</div>
          )}
          <div>
            <div style={{ color: brandColor, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
              Bali Interns
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{company}</div>
          </div>
        </div>

        {/* Middle: Title + Hook */}
        <div>
          <div style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            color: 'white',
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 20,
            letterSpacing: -1,
          }}>
            {title}
          </div>

          {hook && (
            <div style={{
              opacity: hookOpacity,
              transform: `translateY(${hookY}px)`,
              color: brandColor,
              fontSize: 22,
              fontWeight: 600,
              fontStyle: 'italic',
              marginBottom: 30,
            }}>
              &ldquo;{hook}&rdquo;
            </div>
          )}

          {/* Perks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: perksOpacity }}>
            {perks.slice(0, 3).map((perk, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: getPerkProgress(i),
                transform: `translateX(${interpolate(getPerkProgress(i), [0, 1], [-20, 0])}px)`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: brandColor }} />
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, fontWeight: 500 }}>{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Meta + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: ctaOpacity }}>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { icon: '📍', text: location },
              { icon: '⏱', text: duration },
            ].map(({ icon, text }) => text ? (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500 }}>{text}</span>
              </div>
            ) : null)}
          </div>

          <div style={{
            backgroundColor: brandColor, color: '#1a1918',
            padding: '12px 28px', borderRadius: 40,
            fontSize: 16, fontWeight: 900,
            letterSpacing: 0.5,
          }}>
            bali-interns.com →
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
