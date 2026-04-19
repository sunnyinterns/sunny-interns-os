'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ContentItem {
  id: string
  section_key: string
  content_type: 'text' | 'image' | 'video' | 'url' | 'json'
  value: string
  locale: string
  label: string | null
  description: string | null
  updated_at: string
  updated_by: string | null
}

export default function WebsiteCMSPage() {
  const router = useRouter()
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    const res = await fetch('/api/website-content')
    if (res.status === 401) { router.push('/auth/login'); return }
    if (res.ok) {
      const data = (await res.json()) as ContentItem[]
      setItems(data)
      const vals: Record<string, string> = {}
      data.forEach(item => { vals[item.section_key] = item.value })
      setEditValues(vals)
    }
    setLoading(false)
  }

  async function saveItem(key: string) {
    setSaving(key)
    const res = await fetch('/api/website-content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_key: key, value: editValues[key] ?? '' }),
    })
    if (res.ok) {
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
      fetchItems()
    }
    setSaving(null)
  }

  async function uploadFile(key: string, file: File) {
    setUploading(key)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const fileName = `${key}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('website-assets')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('website-assets')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl
      setEditValues(prev => ({ ...prev, [key]: publicUrl }))

      // Save to DB
      await fetch('/api/website-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_key: key, value: publicUrl }),
      })
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
      fetchItems()
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Upload failed — check console for details')
    }
    setUploading(null)
  }

  async function addItem() {
    const key = prompt('Section key (e.g. gallery_image_1, about_text_fr):')
    if (!key) return
    const type = prompt('Content type (text / image / video):') as ContentItem['content_type']
    if (!type || !['text', 'image', 'video', 'url', 'json'].includes(type)) return
    const label = prompt('Label (human-readable name):') || key

    await fetch('/api/website-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_key: key, content_type: type, value: '', label }),
    })
    fetchItems()
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-zinc-400">Loading...</div>

  const grouped: Record<string, ContentItem[]> = {}
  items.forEach(item => {
    const group = item.section_key.split('_')[0] // hero, gallery, about, etc.
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(item)
  })

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1918]">Website CMS</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage content on bali-interns.com — images, videos, text</p>
        </div>
        <button onClick={addItem} className="text-sm font-bold bg-[#c8a96e] text-white px-4 py-2 rounded-xl hover:bg-[#b8994e] transition-colors">
          + Add content
        </button>
      </div>

      {/* Live preview link */}
      <a href="https://bali-interns-website.vercel.app" target="_blank" rel="noopener"
        className="flex items-center gap-2 text-sm text-[#c8a96e] font-semibold hover:underline">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Preview live site →
      </a>

      {Object.entries(grouped).map(([group, groupItems]) => (
        <div key={group}>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
            {group.charAt(0).toUpperCase() + group.slice(1)} section
          </h2>
          <div className="space-y-3">
            {groupItems.map(item => (
              <div key={item.section_key} className="bg-white border border-zinc-100 rounded-2xl p-4 hover:border-[#c8a96e]/30 transition-all">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="text-sm font-bold text-[#1a1918]">{item.label || item.section_key}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] font-mono bg-zinc-50 text-zinc-400 px-1.5 py-0.5 rounded">{item.section_key}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.content_type === 'video' ? 'bg-purple-50 text-purple-600' :
                        item.content_type === 'image' ? 'bg-blue-50 text-blue-600' :
                        'bg-zinc-50 text-zinc-500'
                      }`}>{item.content_type}</span>
                      {item.locale !== 'all' && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{item.locale.toUpperCase()}</span>
                      )}
                    </div>
                    {item.description && <p className="text-[11px] text-zinc-400 mt-1">{item.description}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {saved === item.section_key && (
                      <span className="text-xs text-green-600 font-bold">✓ Saved</span>
                    )}
                    <button
                      onClick={() => saveItem(item.section_key)}
                      disabled={saving === item.section_key || editValues[item.section_key] === item.value}
                      className="text-xs font-bold bg-[#c8a96e] text-white px-3 py-1.5 rounded-lg disabled:opacity-30 hover:bg-[#b8994e] transition-colors"
                    >
                      {saving === item.section_key ? '...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Content editor based on type */}
                {item.content_type === 'text' && (
                  <textarea
                    value={editValues[item.section_key] ?? ''}
                    onChange={e => setEditValues(prev => ({ ...prev, [item.section_key]: e.target.value }))}
                    rows={2}
                    className="w-full mt-2 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e] resize-y"
                  />
                )}

                {(item.content_type === 'image' || item.content_type === 'video') && (
                  <div className="mt-2 space-y-2">
                    {/* URL input */}
                    <input
                      type="text"
                      value={editValues[item.section_key] ?? ''}
                      onChange={e => setEditValues(prev => ({ ...prev, [item.section_key]: e.target.value }))}
                      placeholder="Paste URL or upload below..."
                      className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e] font-mono text-xs"
                    />

                    {/* Upload button */}
                    <div className="flex items-center gap-3">
                      <input
                        ref={el => { fileRefs.current[item.section_key] = el }}
                        type="file"
                        accept={item.content_type === 'video' ? 'video/mp4,video/webm' : 'image/*'}
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) uploadFile(item.section_key, file)
                        }}
                      />
                      <button
                        onClick={() => fileRefs.current[item.section_key]?.click()}
                        disabled={uploading === item.section_key}
                        className="text-xs font-semibold border border-zinc-200 px-3 py-1.5 rounded-lg hover:border-[#c8a96e] transition-colors"
                      >
                        {uploading === item.section_key ? '⏳ Uploading...' : `📁 Upload ${item.content_type}`}
                      </button>
                      {editValues[item.section_key] && item.content_type === 'image' && (
                        <img src={editValues[item.section_key]} alt="" className="h-12 rounded-lg border border-zinc-100 object-cover" />
                      )}
                      {editValues[item.section_key] && item.content_type === 'video' && (
                        <video src={editValues[item.section_key]} className="h-16 rounded-lg border border-zinc-100" muted />
                      )}
                    </div>
                  </div>
                )}

                {item.content_type === 'url' && (
                  <input
                    type="url"
                    value={editValues[item.section_key] ?? ''}
                    onChange={e => setEditValues(prev => ({ ...prev, [item.section_key]: e.target.value }))}
                    className="w-full mt-2 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e] font-mono text-xs"
                  />
                )}

                {/* Last updated */}
                {item.updated_by && (
                  <p className="text-[10px] text-zinc-300 mt-2">
                    Last updated {new Date(item.updated_at).toLocaleDateString()} by {item.updated_by}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-lg mb-2">No website content yet</p>
          <p className="text-sm">Click &quot;+ Add content&quot; to create your first entry</p>
        </div>
      )}

      {/* Help section */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-amber-800 mb-2">💡 How it works</h3>
        <ul className="text-xs text-amber-700 space-y-1.5">
          <li>• Edit text content inline, click <strong>Save</strong> — the website updates within 60 seconds</li>
          <li>• Upload videos/images with the <strong>📁 Upload</strong> button — they go to Supabase Storage</li>
          <li>• For the <strong>Hero video</strong>: upload a .mp4 file, the site switches from photo to video automatically</li>
          <li>• <strong>Section keys</strong> follow the pattern: <code className="bg-amber-100 px-1 rounded">section_field_locale</code> (e.g. hero_video_url, hero_title_fr)</li>
          <li>• Changes are reflected on <a href="https://bali-interns-website.vercel.app" target="_blank" rel="noopener" className="underline font-bold">bali-interns.com</a> after ~60s (SSG revalidation)</li>
        </ul>
      </div>
    </div>
  )
}
