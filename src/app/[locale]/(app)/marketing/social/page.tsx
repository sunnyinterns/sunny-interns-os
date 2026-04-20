'use client'
import { useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

export default function SocialRedirect() {
  const router = useRouter()
  const params = useParams()
  const search = useSearchParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  useEffect(() => {
    const jobId = search.get('job_id')
    const target = jobId
      ? `/${locale}/marketing/jobs?job_id=${jobId}`
      : `/${locale}/marketing/jobs`
    router.replace(target)
  }, [router, locale, search])

  return (
    <div className="flex items-center justify-center h-[calc(100vh-56px)] text-zinc-400">
      <p className="text-sm">Redirection vers Jobs &amp; Contenu…</p>
    </div>
  )
}
