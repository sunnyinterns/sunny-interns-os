'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { BlogEditor, type BlogPostFull } from '../../BlogEditor'

export default function EditBlogPostPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const id = typeof params?.id === 'string' ? params.id : ''
  const [post, setPost] = useState<BlogPostFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/blog-posts/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((d: BlogPostFull) => setPost(d))
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        <div className="h-16 bg-zinc-100 rounded-xl animate-pulse mb-4" />
        <div className="h-96 bg-zinc-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto text-center text-zinc-500">
        <p>Article introuvable</p>
        <p className="text-xs text-red-500 mt-2">{error}</p>
      </div>
    )
  }

  return <BlogEditor locale={locale} initial={post} />
}
