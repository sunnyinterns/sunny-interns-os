'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SuiteMeta } from '@/lib/test-meta'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TestRun {
  id: string
  suite: string
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled'
  triggered_at: string
  started_at: string | null
  finished_at: string | null
  duration_ms: number | null
  total: number
  passed: number
  failed: number
  skipped: number
  github_run_url: string | null
  triggered_by: string | null
}

interface TestStep {
  id: string
  run_id: string
  test_id: string
  title: string
  suite: string
  file: string | null
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  duration_ms: number | null
  error_message: string | null
  started_at: string | null
  finished_at: string | null
  sort_order: number
}

interface Props {
  suites: SuiteMeta[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDuration(ms: number | null): string {
  if (!ms) return ''
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'à l\'instant'
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)}min`
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

const STATUS_ICON: Record<string, string> = {
  pending: '○',
  running: '◉',
  passed: '✓',
  failed: '✗',
  skipped: '—',
  cancelled: '⊘',
}

const STATUS_COLOR: Record<string, string> = {
  pending:   'text-zinc-400',
  running:   'text-[#c8a96e]',
  passed:    'text-[#0d9e75]',
  failed:    'text-[#dc2626]',
  skipped:   'text-zinc-400',
  cancelled: 'text-zinc-400',
}

const STATUS_BG: Record<string, string> = {
  pending:   'bg-zinc-100 text-zinc-500',
  running:   'bg-amber-50 text-[#c8a96e] border border-amber-200',
  passed:    'bg-emerald-50 text-[#0d9e75] border border-emerald-200',
  failed:    'bg-red-50 text-[#dc2626] border border-red-200',
  cancelled: 'bg-zinc-100 text-zinc-500',
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SuiteCard({
  suite,
  lastRun,
  launching,
  onLaunch,
}: {
  suite: SuiteMeta
  lastRun: TestRun | null
  launching: boolean
  onLaunch: () => void
}) {
  const isRunning = lastRun?.status === 'running' || lastRun?.status === 'pending'
  const pct = lastRun && lastRun.total > 0
    ? Math.round(((lastRun.passed + lastRun.failed) / lastRun.total) * 100)
    : 0

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 flex flex-col gap-3 hover:border-zinc-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-md text-white"
            style={{ backgroundColor: suite.color }}
          >
            {suite.suite}
          </span>
          <div>
            <p className="text-sm font-semibold text-[#1a1918]">{suite.label}</p>
            <p className="text-xs text-zinc-400">{suite.tests.length} tests</p>
          </div>
        </div>
        {lastRun && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BG[lastRun.status]}`}>
            {lastRun.status === 'running' && <span className="animate-pulse">● </span>}
            {lastRun.status === 'passed' ? `${lastRun.passed}/${lastRun.total} ✓` :
             lastRun.status === 'failed' ? `${lastRun.failed} erreur${lastRun.failed > 1 ? 's' : ''}` :
             lastRun.status === 'running' ? 'En cours…' :
             lastRun.status === 'pending' ? 'Démarrage…' : lastRun.status}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-500 leading-relaxed">{suite.description}</p>

      {/* Barre de progression du dernier run */}
      {lastRun && lastRun.total > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full flex">
              <div
                className="bg-[#0d9e75] transition-all duration-500"
                style={{ width: `${(lastRun.passed / lastRun.total) * 100}%` }}
              />
              <div
                className="bg-[#dc2626] transition-all duration-500"
                style={{ width: `${(lastRun.failed / lastRun.total) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>{lastRun.passed} ✓ · {lastRun.failed} ✗ · {lastRun.skipped} —</span>
            <span>{fmtAgo(lastRun.triggered_at)}</span>
          </div>
        </div>
      )}

      {/* Launch button */}
      <button
        onClick={onLaunch}
        disabled={launching || isRunning}
        className={`
          w-full text-xs font-semibold py-2 rounded-lg transition-all
          ${launching || isRunning
            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
            : 'bg-[#1a1918] text-white hover:bg-[#2d2c2b] active:scale-[0.98]'}
        `}
      >
        {isRunning
          ? `${pct}% en cours…`
          : launching
          ? 'Démarrage…'
          : `▶ Lancer suite ${suite.suite}`}
      </button>
    </div>
  )
}

function StepRow({ step }: { step: TestStep }) {
  const [expanded, setExpanded] = useState(false)
  const canExpand = !!(step.error_message || (step as any).screenshot_url)

  return (
    <div className={`border-b border-zinc-50 last:border-0 ${step.status === 'running' ? 'bg-amber-50/40' : ''}`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-50 transition-colors"
        onClick={() => canExpand && setExpanded(!expanded)}
      >
        {/* Status icon */}
        <span className={`text-sm font-bold w-4 flex-shrink-0 ${STATUS_COLOR[step.status]} ${step.status === 'running' ? 'animate-pulse' : ''}`}>
          {STATUS_ICON[step.status]}
        </span>

        {/* ID badge */}
        <span className="text-[10px] font-mono font-bold text-zinc-400 w-8 flex-shrink-0">
          {step.test_id}
        </span>

        {/* Title */}
        <span className={`text-xs flex-1 ${
          step.status === 'failed' ? 'text-[#dc2626]' :
          step.status === 'passed' ? 'text-[#1a1918]' :
          step.status === 'running' ? 'text-[#c8a96e] font-medium' :
          'text-zinc-400'
        }`}>
          {step.title}
        </span>

        {/* Screenshot indicator */}
        {(step as any).screenshot_url && (
          <span className="text-[10px] text-zinc-300 flex-shrink-0">📷</span>
        )}

        {/* Duration */}
        {step.duration_ms && (
          <span className="text-[10px] text-zinc-400 flex-shrink-0 font-mono">
            {fmtDuration(step.duration_ms)}
          </span>
        )}

        {/* Expand indicator */}
        {canExpand && (
          <span className="text-[10px] text-zinc-300">{expanded ? '▲' : '▼'}</span>
        )}
      </button>

      {/* Expanded: screenshot + erreur */}
      {expanded && (
        <div className="px-4 pb-4 ml-7 space-y-3">
          {/* Screenshot */}
          {(step as any).screenshot_url && (
            <div className="rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
              <div className="bg-zinc-800 px-3 py-1.5 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-[10px] text-zinc-400 flex-1 truncate">
                  sunny-interns-os.vercel.app — {step.test_id} {step.title}
                </span>
                <a
                  href={(step as any).screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-[10px] text-zinc-400 hover:text-zinc-200 underline"
                >
                  Ouvrir ↗
                </a>
              </div>
              <img
                src={(step as any).screenshot_url}
                alt={`Screenshot ${step.test_id}`}
                className="w-full object-cover max-h-64 object-top"
                loading="lazy"
              />
            </div>
          )}

          {/* Erreur */}
          {step.error_message && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-[11px] font-mono text-[#dc2626] break-all leading-relaxed">
                {step.error_message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RunPanel({
  run,
  steps,
  onGitHub,
}: {
  run: TestRun
  steps: TestStep[]
  onGitHub: () => void
}) {
  const isLive = run.status === 'running' || run.status === 'pending'
  const elapsed = run.started_at
    ? Date.now() - new Date(run.started_at).getTime()
    : null

  // Grouper par suite
  const bySuite = steps.reduce<Record<string, TestStep[]>>((acc, s) => {
    if (!acc[s.suite]) acc[s.suite] = []
    acc[s.suite].push(s)
    return acc
  }, {})

  const suiteColors: Record<string, string> = {
    A: '#0d9e75', B: '#c8a96e', C: '#6366f1', E: '#ec4899',
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Run header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        run.status === 'running' ? 'border-amber-200 bg-amber-50/50' :
        run.status === 'passed' ? 'border-emerald-200 bg-emerald-50/30' :
        run.status === 'failed' ? 'border-red-200 bg-red-50/30' :
        'border-zinc-200'
      }`}>
        <div className="flex items-center gap-3">
          <span className={`text-lg ${STATUS_COLOR[run.status]} ${isLive ? 'animate-pulse' : ''}`}>
            {STATUS_ICON[run.status]}
          </span>
          <div>
            <p className="text-sm font-semibold text-[#1a1918]">
              Suite {run.suite === 'all' ? 'complète' : run.suite}
              {isLive && <span className="ml-2 text-xs text-[#c8a96e] font-normal">En cours…</span>}
            </p>
            <p className="text-xs text-zinc-400">
              Démarré {fmtTime(run.started_at)} ·{' '}
              {run.duration_ms ? fmtDuration(run.duration_ms) : elapsed ? `${Math.floor(elapsed / 1000)}s` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-[#1a1918]">
              <span className="text-[#0d9e75]">{run.passed}</span>
              {' / '}
              <span className="text-zinc-500">{run.total}</span>
            </p>
            {run.failed > 0 && (
              <p className="text-xs text-[#dc2626]">{run.failed} échoué{run.failed > 1 ? 's' : ''}</p>
            )}
          </div>
          {run.github_run_url && (
            <button
              onClick={onGitHub}
              className="text-xs text-zinc-400 hover:text-[#1a1918] transition-colors underline underline-offset-2"
            >
              GitHub ↗
            </button>
          )}
        </div>
      </div>

      {/* Barre de progression globale */}
      {run.total > 0 && (
        <div className="h-1 bg-zinc-100">
          <div className="h-full flex transition-all duration-300">
            <div
              className="bg-[#0d9e75] transition-all duration-500"
              style={{ width: `${(run.passed / run.total) * 100}%` }}
            />
            <div
              className="bg-[#dc2626] transition-all duration-500"
              style={{ width: `${(run.failed / run.total) * 100}%` }}
            />
            <div
              className={`transition-all duration-500 ${isLive ? 'bg-amber-300 animate-pulse' : 'bg-zinc-200'}`}
              style={{ width: `${(run.skipped / run.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps par suite */}
      <div className="max-h-[540px] overflow-y-auto">
        {Object.entries(bySuite).map(([suite, suiteSteps]) => (
          <div key={suite}>
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border-b border-zinc-100 sticky top-0">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: suiteColors[suite] ?? '#888' }}
              >
                {suite}
              </span>
              <span className="text-xs text-zinc-500">
                {suiteSteps.filter(s => s.status === 'passed').length}/{suiteSteps.length} passés
              </span>
            </div>
            {suiteSteps.map(step => (
              <StepRow key={step.id} step={step} />
            ))}
          </div>
        ))}

        {steps.length === 0 && (
          <div className="py-12 text-center text-zinc-400 text-sm">
            En attente de démarrage…
          </div>
        )}
      </div>
    </div>
  )
}

function HistoryRow({ run, onSelect }: { run: TestRun; onSelect: () => void }) {
  const suiteLabels: Record<string, string> = {
    A: 'Workflow', B: 'Branches', C: 'Admin', E: 'Settings', all: 'Complet',
  }
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0 text-left"
    >
      <span className={`text-sm ${STATUS_COLOR[run.status]}`}>
        {STATUS_ICON[run.status]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#1a1918] truncate">
          Suite {suiteLabels[run.suite] ?? run.suite}
        </p>
        <p className="text-[10px] text-zinc-400">
          {fmtAgo(run.triggered_at)}
          {run.duration_ms ? ` · ${fmtDuration(run.duration_ms)}` : ''}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-mono text-zinc-500">
          {run.passed}/{run.total}
        </p>
        {run.failed > 0 && (
          <p className="text-[10px] text-[#dc2626]">{run.failed} ✗</p>
        )}
      </div>
    </button>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function TestDashboard({ suites }: Props) {
  const [runs, setRuns] = useState<TestRun[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [activeRun, setActiveRun] = useState<TestRun | null>(null)
  const [activeSteps, setActiveSteps] = useState<TestStep[]>([])
  const [launching, setLaunching] = useState<string | null>(null) // suite en cours de lancement
  const [error, setError] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Chargement historique ──────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/tests/runs')
      if (!res.ok) return
      const { runs: data } = await res.json()
      setRuns(data ?? [])

      // Auto-sélectionner le dernier run en cours s'il n'y en a pas d'actif
      const inProgress = data?.find((r: TestRun) => r.status === 'running' || r.status === 'pending')
      if (inProgress && !activeRunId) {
        setActiveRunId(inProgress.id)
      }
    } catch { /* silencieux */ }
  }, [activeRunId])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // ── Polling du run actif ───────────────────────────────────────────────────
  const pollActiveRun = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/tests/runs?run_id=${runId}`)
      if (!res.ok) return
      const { run, steps } = await res.json()
      setActiveRun(run)
      setActiveSteps(steps ?? [])

      // Màj dans l'historique
      setRuns(prev => {
        const idx = prev.findIndex(r => r.id === runId)
        if (idx === -1) return [run, ...prev]
        const next = [...prev]
        next[idx] = run
        return next
      })

      // Arrêter le polling si terminé
      if (run.status === 'passed' || run.status === 'failed' || run.status === 'cancelled') {
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
        setLaunching(null)
      }
    } catch { /* silencieux */ }
  }, [])

  useEffect(() => {
    if (!activeRunId) return

    // Poll immédiat
    pollActiveRun(activeRunId)

    // Puis toutes les 3s
    pollRef.current = setInterval(() => pollActiveRun(activeRunId), 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeRunId, pollActiveRun])

  // ── Lancement d'un run ─────────────────────────────────────────────────────
  const handleLaunch = useCallback(async (suite: string) => {
    setError(null)
    setLaunching(suite)

    try {
      const res = await fetch('/api/tests/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suite }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erreur de déclenchement')
        setLaunching(null)
        return
      }

      setActiveRunId(data.run_id)
      await loadHistory()
    } catch (e) {
      setError('Impossible de joindre le serveur')
      setLaunching(null)
    }
  }, [loadHistory])

  // ── Résumé global ──────────────────────────────────────────────────────────
  const lastRuns = suites.reduce<Record<string, TestRun | null>>((acc, s) => {
    acc[s.suite] = runs.find(r => r.suite === s.suite || r.suite === 'all') ?? null
    return acc
  }, {})

  const totalPassed = runs[0]?.passed ?? 0
  const totalTests = runs[0]?.total ?? suites.reduce((n, s) => n + s.tests.length, 0)
  const globalStatus = runs[0]?.status ?? null

  return (
    <div className="p-6 space-y-6">

      {/* ── Barre stats globale ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-zinc-200">
        <div className="flex-1 grid grid-cols-4 gap-4 text-center">
          {[
            { label: 'Tests total', value: suites.reduce((n, s) => n + s.tests.length, 0), color: 'text-zinc-700' },
            { label: 'Dernier run', value: globalStatus ? (STATUS_ICON[globalStatus] + ' ' + globalStatus) : '—', color: STATUS_COLOR[globalStatus ?? 'pending'] },
            { label: 'Passés', value: runs[0] ? runs[0].passed : '—', color: 'text-[#0d9e75]' },
            { label: 'Échoués', value: runs[0] ? runs[0].failed : '—', color: runs[0]?.failed ? 'text-[#dc2626]' : 'text-zinc-400' },
          ].map(stat => (
            <div key={stat.label}>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-zinc-400">{stat.label}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => handleLaunch('all')}
          disabled={!!launching || (activeRun?.status === 'running' || activeRun?.status === 'pending')}
          className={`
            flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-bold transition-all
            ${launching || activeRun?.status === 'running' || activeRun?.status === 'pending'
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              : 'bg-[#c8a96e] text-white hover:bg-[#b5975e] active:scale-[0.98] shadow-sm'}
          `}
        >
          {launching === 'all' || activeRun?.status === 'running'
            ? '⏳ En cours…'
            : '▶ Tout lancer'}
        </button>
      </div>

      {/* ── Erreur ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-[#dc2626] flex items-center justify-between">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      {/* ── Grille des suites ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {suites.map(suite => (
          <SuiteCard
            key={suite.suite}
            suite={suite}
            lastRun={runs.find(r => r.suite === suite.suite || r.suite === 'all') ?? null}
            launching={launching === suite.suite}
            onLaunch={() => handleLaunch(suite.suite)}
          />
        ))}
      </div>

      {/* ── Run actif + historique ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Panel run actif — 2/3 */}
        <div className="xl:col-span-2">
          {activeRun ? (
            <RunPanel
              run={activeRun}
              steps={activeSteps}
              onGitHub={() => activeRun.github_run_url && window.open(activeRun.github_run_url, '_blank')}
            />
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-zinc-200 flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-4xl">🧪</p>
              <p className="text-sm text-zinc-400">Lance une suite pour voir les résultats ici</p>
              <p className="text-xs text-zinc-300">Mise à jour toutes les 3 secondes</p>
            </div>
          )}
        </div>

        {/* Historique — 1/3 */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#1a1918]">Historique</p>
            <button
              onClick={loadHistory}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              ↻ Actualiser
            </button>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {runs.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8">Aucun run pour l&apos;instant</p>
            ) : (
              runs.map(run => (
                <HistoryRow
                  key={run.id}
                  run={run}
                  onSelect={() => setActiveRunId(run.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Légende ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 text-[10px] text-zinc-400">
        {[
          { icon: '○', label: 'En attente', color: 'text-zinc-400' },
          { icon: '◉', label: 'En cours', color: 'text-[#c8a96e]' },
          { icon: '✓', label: 'Passé', color: 'text-[#0d9e75]' },
          { icon: '✗', label: 'Échoué', color: 'text-[#dc2626]' },
          { icon: '—', label: 'Ignoré', color: 'text-zinc-400' },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1">
            <span className={item.color}>{item.icon}</span>
            {item.label}
          </span>
        ))}
        <span className="ml-auto">Polling 3s · GitHub Actions CI</span>
      </div>
    </div>
  )
}
