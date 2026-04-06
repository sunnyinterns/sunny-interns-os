'use client'

import { useEffect, useState, useCallback } from 'react'
import { FeedZone } from '@/components/feed/FeedZone'
import { EmptyFeed } from '@/components/feed/EmptyFeed'
import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'
import type { FeedData } from '@/lib/types'

function FeedSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <div className="h-4 w-32 bg-zinc-200 rounded mb-3" />
          <div className="space-y-2">
            {[1, 2].map((j) => (
              <div key={j} className="h-16 bg-zinc-100 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchFeed = useCallback(() => {
    setLoading(true)
    fetch('/api/feed')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<FeedData>
      })
      .then((data) => {
        setFeed(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  function handleCaseCreated() {
    setShowModal(false)
    setToast({ message: 'Dossier créé avec succès', type: 'success' })
    fetchFeed()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Activité</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          + Nouveau dossier
        </Button>
      </div>

      {loading && <FeedSkeleton />}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#dc2626]">
          Erreur lors du chargement : {error}
        </div>
      )}

      {feed && feed.isEmpty && (
        <EmptyFeed onCreateCase={() => setShowModal(true)} />
      )}

      {feed && !feed.isEmpty && (
        <div className="space-y-8">
          <FeedZone
            title="Aujourd'hui"
            count={feed.today.length}
            items={feed.today}
            type="today"
          />
          <FeedZone
            title="À faire maintenant"
            count={feed.todo.length}
            items={feed.todo}
            type="todo"
          />
          <FeedZone
            title="En attente"
            count={feed.waiting.length}
            items={feed.waiting}
            type="waiting"
          />
          <FeedZone
            title="Complété aujourd'hui"
            count={feed.completed.length}
            items={feed.completed}
            type="completed"
          />
        </div>
      )}

      {showModal && (
        <NewCaseModal
          onClose={() => setShowModal(false)}
          onSuccess={handleCaseCreated}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
