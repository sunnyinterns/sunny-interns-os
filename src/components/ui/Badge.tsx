type Variant = 'default' | 'success' | 'attention' | 'critical' | 'info'

interface BadgeProps {
  label: string
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-zinc-100 text-zinc-600',
  success: 'bg-emerald-50 text-[#0d9e75]',
  attention: 'bg-amber-50 text-[#d97706]',
  critical: 'bg-red-50 text-[#dc2626]',
  info: 'bg-blue-50 text-blue-600',
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
      ].join(' ')}
    >
      {label}
    </span>
  )
}
