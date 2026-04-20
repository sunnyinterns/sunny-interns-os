'use client'
import { useEffect, useState, useCallback } from 'react'

type Platform = 'instagram' | 'linkedin' | 'tiktok' | 'facebook'
type Lang = 'fr' | 'en'
type Status = 'draft' | 'ready' | 'published'

interface Job {
  id: string; title: string; public_title: string | null
  description: string | null; location: string | null
  wished_duration_months: number | null
  // Champs Publication & Contenu
  public_hook: string | null
  public_vibe: string | null
  public_perks: string[] | null
  public_hashtags: string[] | null
  seo_slug: string | null
  cover_image_url: string | null
  companies?: { id: string; name: string; logo_url?: string | null } | null
}

interface SocialPost {
  id: string; job_id: string | null; platform: Platform; lang: Lang; tone: string | null
  content: string; hashtags: string[]; image_url: string | null; image_prompt: string | null
  status: Status; created_at: string
  jobs?: { title: string; public_title: string | null; companies?: { name: string } | null } | null
}

const PLATFORMS: { key: Platform; label: string; icon: string; color: string; maxLen: number; ratio: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C', maxLen: 2200, ratio: '1:1 ou 4:5' },
  { key: 'linkedin',  label: 'LinkedIn',  icon: '💼', color: '#0077B5', maxLen: 3000, ratio: '1.91:1' },
  { key: 'tiktok',   label: 'TikTok',    icon: '🎵', color: '#000',    maxLen: 2200, ratio: '9:16' },
  { key: 'facebook', label: 'Facebook',  icon: '👥', color: '#1877F2', maxLen: 5000, ratio: '1.91:1' },
]

const TONES = ['Professionnel', 'Enthousiaste', 'Décontracté', 'Inspirant', 'Urgence']

function imagePromptForJob(job: Job, platform: Platform): string {
  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? 'une entreprise'
  const location = job.location ?? 'Bali, Indonésie'
  const vibe = job.public_vibe ?? ''
  const perks = job.public_perks?.filter(Boolean).slice(0, 3).join(', ') ?? ''

  const styles: Record<Platform, string> = {
    instagram: `vibrant tropical lifestyle photo, golden hour, young professional in ${location}, Bali beach or coworking vibes, warm orange #F5A623 and yellow palette, Instagram-ready aesthetic, photorealistic`,
    linkedin: `clean professional corporate visual, modern tropical coworking space in Bali, brand colors #F5A623 warm gold and #1A1918 dark, minimalist design, photorealistic`,
    tiktok: `dynamic energetic visual, young trendy 25yo professional, bold colors, Bali adventure meets career, tropical nature background, photorealistic`,
    facebook: `friendly approachable photo, professional yet casual, Bali tropical setting, ${vibe || 'team atmosphere'}, warm colors, community feel, photorealistic`,
  }

  const vibeContext = vibe ? `Atmosphere: ${vibe}.` : ''
  const perksContext = perks ? `Key selling points: ${perks}.` : ''

  return `Professional marketing photograph for a ${title} internship in ${company}, ${location}, Indonesia.
${vibeContext}
${perksContext}
Visual style: ${styles[platform]}.
The scene shows a young French professional (25yo, stylish casual) thriving in a beautiful tropical work environment.
Colors must include warm gold/orange (#F5A623) accents naturally in the scene (sunset, decor, clothing).
DO NOT include any text, words, logos, watermarks, or UI elements.
Ultra high quality, editorial photography style, magazine-worthy.`
}

function textPrompt(job: Job, platform: Platform, tone: string, lang: Lang): string {
  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? 'une entreprise partenaire'
  const duration = job.wished_duration_months ? `${job.wished_duration_months} mois` : 'plusieurs mois'
  const langLabel = lang === 'fr' ? 'français' : 'anglais'
  const hook = job.public_hook ? `\nACCROCHE IMPOSÉE (commence le post par ça): "${job.public_hook}"` : ''
  const vibe = job.public_vibe ? `\nAmbiance entreprise: ${job.public_vibe}` : ''
  const perks = job.public_perks?.filter(Boolean).length ? `\nAvantages à mettre en avant: ${job.public_perks.filter(Boolean).join(', ')}` : ''
  const customTags = job.public_hashtags?.filter(Boolean).length
    ? `\nHashtags imposés (OBLIGATOIRES, à inclure): ${job.public_hashtags.filter(Boolean).map(h => h.startsWith('#') ? h : '#' + h).join(' ')}`
    : ''

  return `Tu es community manager pour Bali Interns, une agence de stages à Bali, Indonésie.
Écris un post ${platform} en ${langLabel} pour cette offre de stage:

INFORMATIONS:
- Poste: ${title}
- Entreprise: ${company}
- Durée: ${duration}
- Lieu: ${job.location ?? 'Bali, Indonésie'}
${job.description ? `- Description: ${job.description.slice(0, 300)}` : ''}${hook}${vibe}${perks}${customTags}

TON: ${tone}
PLATEFORME: ${platform}
${platform === 'instagram' ? '→ Commence par l\'accroche. Storytelling, emojis, 8-12 hashtags (imposés + tendance)' : ''}
${platform === 'linkedin' ? '→ Professionnel, axé développement de carrière, 3-5 hashtags (imposés + pertinents)' : ''}
${platform === 'tiktok' ? '→ Hook ultra fort en 1ère ligne, max 150 mots, rythme rapide, 3-5 hashtags' : ''}
${platform === 'facebook' ? '→ Chaleureux et accessible, CTA clair pour postuler, 3-5 hashtags' : ''}

RÈGLES:
- CTA obligatoire: finir par "Postuler sur bali-interns.com"
- Inclure TOUS les hashtags imposés s\'il y en a
- Retourne UNIQUEMENT le texte du post, rien d'autre\`
}


