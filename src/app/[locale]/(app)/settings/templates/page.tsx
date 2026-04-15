'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function TemplatesRedirectPage() {
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  useEffect(() => {
    router.replace(`/${locale}/settings/email-templates`)
  }, [router, locale])

  return null
}
