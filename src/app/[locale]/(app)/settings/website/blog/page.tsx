'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface BlogPost {
  id: string
  slug: string
  title_en: string
  title_fr: string | null
  excerpt_en: string | null
  excerpt_fr: string | null
  body_en: string | null
  body_fr: string | null
  seo_title_en: string | null
  seo_title_fr: string | null
  seo_desc_en: string | null
  seo_desc_fr: string | null
  category: string
  status: string
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export default function BlogManagerPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<BlogPost>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchPosts() }, [])

  async function fetchPosts() {
    const supabase = createClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
    setPosts((data as BlogPost[]) || [])
    setLoading(false)
  }

  async function savePost(id: string) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('blog_posts')
      .update({ ...editData, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) alert('Error: ' + error.message)
    else { setEditing(null); fetchPosts() }
    setSaving(false)
  }

  async function toggleStatus(post: BlogPost) {
    const newStatus = post.status === 'published' ? 'draft' : 'published'
    const supabase = createClient()
    await supabase.from('blog_posts').update({ status: newStatus }).eq('id', post.id)
    fetchPosts()
  }

  function startEdit(post: BlogPost) {
    setEditing(post.id)
    setEditData({
      title_en: post.title_en,
      title_fr: post.title_fr,
      excerpt_en: post.excerpt_en,
      excerpt_fr: post.excerpt_fr,
      seo_title_en: post.seo_title_en,
      seo_title_fr: post.seo_title_fr,
      seo_desc_en: post.seo_desc_en,
      seo_desc_fr: post.seo_desc_fr,
      category: post.category,
      cover_image_url: post.cover_image_url,
    })
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-zinc-400">Loading blog posts...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1918]">Blog Manager</h1>
          <p className="text-sm text-zinc-500 mt-1">{posts.length} articles · Edit titles, SEO, excerpts, status</p>
        </div>
        <a href="https://bali-interns-website.vercel.app/blog" target="_blank" rel="noopener"
          className="text-sm font-bold bg-[#c8a96e] text-white px-4 py-2 rounded-xl hover:bg-[#b8994e] transition-colors no-underline">
          Preview blog →
        </a>
      </div>

      <div className="space-y-3">
        {posts.map(post => (
          <div key={post.id} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden hover:border-[#c8a96e]/30 transition-all">
            {/* Header row */}
            <div className="p-4 flex items-center gap-4">
              {post.cover_image_url && (
                <img src={post.cover_image_url} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0 border border-zinc-100" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1a1918] truncate">{post.title_en}</p>
                {post.title_fr && <p className="text-xs text-zinc-400 truncate mt-0.5">{post.title_fr}</p>}
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-mono bg-zinc-50 text-zinc-400 px-1.5 py-0.5 rounded">{post.slug}</span>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{post.category}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    post.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-zinc-50 text-zinc-400'
                  }`}>{post.status}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleStatus(post)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    post.status === 'published'
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-green-200 text-green-700 hover:bg-green-50'
                  }`}
                >
                  {post.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => editing === post.id ? setEditing(null) : startEdit(post)}
                  className="text-xs font-bold bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  {editing === post.id ? 'Close' : 'Edit'}
                </button>
              </div>
            </div>

            {/* Edit panel */}
            {editing === post.id && (
              <div className="border-t border-zinc-100 p-4 bg-zinc-50/50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Title EN</label>
                    <input value={editData.title_en ?? ''} onChange={e => setEditData(d => ({ ...d, title_en: e.target.value }))}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Title FR</label>
                    <input value={editData.title_fr ?? ''} onChange={e => setEditData(d => ({ ...d, title_fr: e.target.value }))}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">SEO Title EN</label>
                    <input value={editData.seo_title_en ?? ''} onChange={e => setEditData(d => ({ ...d, seo_title_en: e.target.value }))}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">SEO Title FR</label>
                    <input value={editData.seo_title_fr ?? ''} onChange={e => setEditData(d => ({ ...d, seo_title_fr: e.target.value }))}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">SEO Desc EN</label>
                    <textarea value={editData.seo_desc_en ?? ''} onChange={e => setEditData(d => ({ ...d, seo_desc_en: e.target.value }))} rows={2}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e] resize-y" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">SEO Desc FR</label>
                    <textarea value={editData.seo_desc_fr ?? ''} onChange={e => setEditData(d => ({ ...d, seo_desc_fr: e.target.value }))} rows={2}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e] resize-y" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Excerpt EN</label>
                    <textarea value={editData.excerpt_en ?? ''} onChange={e => setEditData(d => ({ ...d, excerpt_en: e.target.value }))} rows={2}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e] resize-y" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Excerpt FR</label>
                    <textarea value={editData.excerpt_fr ?? ''} onChange={e => setEditData(d => ({ ...d, excerpt_fr: e.target.value }))} rows={2}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e] resize-y" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Category</label>
                    <input value={editData.category ?? ''} onChange={e => setEditData(d => ({ ...d, category: e.target.value }))}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cover Image URL</label>
                    <input value={editData.cover_image_url ?? ''} onChange={e => setEditData(d => ({ ...d, cover_image_url: e.target.value }))}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditing(null)} className="text-xs text-zinc-400 px-4 py-2">Cancel</button>
                  <button onClick={() => savePost(post.id)} disabled={saving}
                    className="text-xs font-bold bg-[#c8a96e] text-white px-5 py-2 rounded-xl hover:bg-[#b8994e] disabled:opacity-50 transition-colors">
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
