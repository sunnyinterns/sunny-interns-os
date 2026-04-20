import { useState, useCallback } from 'react'

export function useAIAssist() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const assist = useCallback(async (action: string, ctx: Record<string, string>): Promise<string | null> => {
    setLoadingAction(action)
    try {
      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...ctx }),
      })
      if (!res.ok) return null
      const data = await res.json() as { result: string }
      return data.result ?? null
    } catch {
      return null
    } finally {
      setLoadingAction(null)
    }
  }, [])

  // isLoading(action) → true uniquement pour CE bouton précis
  const isLoading = useCallback((action: string) => loadingAction === action, [loadingAction])

  // loading global = un quelconque bouton tourne
  const loading = loadingAction !== null

  return { assist, loading, isLoading, loadingAction }
}
