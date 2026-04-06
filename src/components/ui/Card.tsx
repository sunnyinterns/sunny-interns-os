interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
}

export function Card({ children, className = '', title, description }: CardProps) {
  return (
    <div className={['bg-white rounded-xl shadow-sm border border-zinc-100 p-6', className].join(' ')}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-base font-semibold text-[#1a1918]">{title}</h3>}
          {description && <p className="text-sm text-zinc-500 mt-0.5">{description}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
