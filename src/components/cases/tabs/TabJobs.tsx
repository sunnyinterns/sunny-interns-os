'use client'

interface JobData {
  id: string
  title?: string
  company_id?: string
  status?: string
  companies?: { id: string; name: string } | null
}

interface TabJobsProps {
  jobs: JobData[]
}

export function TabJobs({ jobs }: TabJobsProps) {
  if (jobs.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-zinc-400 bg-white rounded-xl border border-zinc-100 border-dashed">
        Aucune offre soumise
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <div key={job.id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-zinc-100">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1a1918] truncate">{job.title ?? 'Offre sans titre'}</p>
            {job.companies?.name && (
              <p className="text-xs text-zinc-400 mt-0.5">{job.companies.name}</p>
            )}
          </div>
          {job.status && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 flex-shrink-0">
              {job.status}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
