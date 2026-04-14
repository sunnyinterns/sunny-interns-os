'use client'

import { useState } from 'react'

export function useAIAssist() {
  const [loading, setLoading] = useState(false)

  async function assist(action: string, ctx: Record<string, string>): Promise<string | null> {
    setLoading(true)
    try {
      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...ctx }),
      })
      if (!res.ok) return null
      const data = await res.json() as { result: string }
      return data.result
    } finally {
      setLoading(false)
    }
  }

  return { assist, loading }
}
