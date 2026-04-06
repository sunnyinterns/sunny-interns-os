import Image from 'next/image'

type Size = 'sm' | 'md' | 'lg'

interface AvatarProps {
  src?: string
  name: string
  size?: Size
}

const sizeClasses: Record<Size, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

const sizePx: Record<Size, number> = {
  sm: 28,
  md: 36,
  lg: 48,
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-violet-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-emerald-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-rose-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const px = sizePx[size]

  if (src) {
    return (
      <div className={['relative rounded-full overflow-hidden flex-shrink-0', sizeClasses[size]].join(' ')}>
        <Image src={src} alt={name} width={px} height={px} className="object-cover" />
      </div>
    )
  }

  return (
    <div
      className={[
        'rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold',
        sizeClasses[size],
        getColorFromName(name),
      ].join(' ')}
    >
      {getInitials(name)}
    </div>
  )
}
