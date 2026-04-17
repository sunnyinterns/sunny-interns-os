'use client'

import { useParams } from 'next/navigation'
import { BlogEditor } from '../BlogEditor'

export default function NewBlogPostPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  return <BlogEditor locale={locale} initial={null} />
}
