import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import JobPublicPage from './JobPublicPage'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Job {
  id: string
  title: string
  public_title: string | null
  description: string | null
  public_description: string | null
  public_hook: string | null
  public_vibe: string | null
  public_perks: string[] | null
  public_hashtags: string[] | null
  seo_slug: string | null
  cover_image_url: string | null
  cv_drop_enabled: boolean | null
  is_public: boolean | null
  status: string
  location: string | null
  wished_duration_months: number | null
  wished_start_date: string | null
  department: string | null
  missions: string[] | null
  skills_required: string[] | null
  required_level: string | null
  required_languages: string[] | null
  companies?: { id: string; name: string; logo_url: string | null; company_address_city: string | null } | null
}

async function getJob(slug: string): Promise<Job | null> {
  const { data } = await sb
    .from('jobs')
    .select(`
      id, title, public_title, description, public_description,
      public_hook, public_vibe, public_perks, public_hashtags,
      seo_slug, cover_image_url, background_image_url, cv_drop_enabled, is_public, status,
      location, wished_duration_months, wished_start_date,
      department, missions, skills_required, required_level, required_languages
    `)
    .eq('seo_slug', slug)
    .eq('is_public', true)
    .single()
  return data as Job | null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const job = await getJob(params.slug)
  if (!job) return { title: 'Offre introuvable – Bali Interns' }

  const title = job.public_title ?? job.title
  const duration = job.wished_duration_months ? `${job.wished_duration_months} months` : ''
  const heroImg = (job as unknown as { background_image_url?: string }).background_image_url ?? job.cover_image_url
  const desc = job.public_hook
    ?? job.public_description
    ?? `${title} internship in Bali${duration ? ` · ${duration}` : ''} — exclusively via Bali Interns`

  return {
    title: `${title} – Internship in Bali | Bali Interns`,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: heroImg ? [{ url: heroImg, width: 1200, height: 630 }] : [],
      type: 'website',
      siteName: 'Bali Interns',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: heroImg ? [heroImg] : [],
    },
    alternates: { canonical: `https://sunny-interns-os.vercel.app/offre/${params.slug}` },
  }
}

export default async function JobSlugPage({ params }: { params: { slug: string } }) {
  const job = await getJob(params.slug)
  if (!job) notFound()
  return <JobPublicPage job={job} />
}
