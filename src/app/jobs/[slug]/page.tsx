import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import JobPublicPage from './JobPublicPage'

interface Job {
  id: string
  public_title: string | null
  title: string
  status: string
  location: string | null
  wished_duration_months: number | null
  wished_start_date: string | null
  public_description: string | null
  description: string | null
  public_hook: string | null
  public_vibe: string | null
  public_perks: string[] | null
  public_hashtags: string[] | null
  seo_slug: string | null
  cv_drop_enabled: boolean
  cover_image_url: string | null
  is_public: boolean
  missions: string[] | null
  required_languages: string[] | null
  required_level: string | null
  profile_sought: string | null
  remote_ok: boolean
  companies: { id: string; name: string; logo_url: string | null; company_type: string | null } | null
}

async function getJob(slug: string): Promise<Job | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sunny-interns-os.vercel.app'
  try {
    const res = await fetch(`${base}/api/public/jobs?slug=${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 }, // cache 5 min
    })
    if (!res.ok) return null
    return res.json() as Promise<Job>
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const job = await getJob(slug)
  if (!job) return { title: 'Stage introuvable — Bali Interns' }

  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? 'Bali'
  const duration = job.wished_duration_months ? `${job.wished_duration_months} mois` : ''
  const location = job.location ?? 'Bali, Indonésie'

  const description = job.public_hook
    ?? `Stage ${title} chez ${company} à ${location}${duration ? ` — ${duration}` : ''}. Postulez sur Bali Interns.`

  return {
    title: `Stage ${title} @ ${company} — Bali Interns`,
    description,
    openGraph: {
      title: `Stage ${title} @ ${company}`,
      description,
      images: job.cover_image_url ? [{ url: job.cover_image_url }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Stage ${title} @ ${company}`,
      description,
      images: job.cover_image_url ? [job.cover_image_url] : [],
    },
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const job = await getJob(slug)
  if (!job) notFound()
  return <JobPublicPage job={job} />
}
