'use client'
import { useRouter, useParams } from 'next/navigation'
import { useEffect } from 'react'

export default function TodoPage() {
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  useEffect(() => {
    // Rediriger vers le feed avec l'onglet todo ouvert
    router.replace(`/${locale}/feed?tab=todo`)
  }, [locale, router])

  return null
}
