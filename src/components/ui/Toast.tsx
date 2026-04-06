'use client'

import { useEffect } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  onClose: () => void
}

const typeClasses: Record<ToastType, string> = {
  success: 'border-l-[#0d9e75] bg-emerald-50 text-emerald-900',
  error: 'border-l-[#dc2626] bg-red-50 text-red-900',
  warning: 'border-l-[#d97706] bg-amber-50 text-amber-900',
  info: 'border-l-blue-500 bg-blue-50 text-blue-900',
}

const typeIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={[
        'fixed bottom-4 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border border-l-4 max-w-sm',
        typeClasses[type],
      ].join(' ')}
      role="alert"
    >
      <span className="text-sm font-semibold mt-0.5">{typeIcons[type]}</span>
      <p className="text-sm flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-current opacity-50 hover:opacity-100 transition-opacity text-lg leading-none"
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  )
}
