import { TestDashboard } from '@/components/tests/TestDashboard'
import { TEST_SUITES, TOTAL_TESTS } from '@/lib/test-meta'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tests E2E — Sunny Interns OS',
}

export default function TestsPage() {
  return (
    <div className="min-h-screen bg-[#fafaf7]">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#1a1918]">Tests E2E</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {TOTAL_TESTS} scénarios · 4 suites · Vercel → Supabase live
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-[#0d9e75] inline-block" />
          sunny-interns-os.vercel.app
        </div>
      </div>

      <TestDashboard suites={TEST_SUITES} />
    </div>
  )
}
