"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────
interface SiteImage {
  id: string;
  page: string;
  section: string;
  slot: string;
  label_fr: string;
  image_url: string;
  image_type: "photo" | "video" | "avatar" | "logo";
  aspect: string;
  notes: string | null;
  updated_at: string;
}

interface GalleryTile {
  id: string;
  loc_en: string;
  loc_fr: string;
  label_en: string;
  label_fr: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

// ── Badge helper ─────────────────────────────────────────────────────────────
const TYPE_BADGE: Record<string, string> = {
  photo: "📷 Photo",
  video: "🎬 Vidéo",
  avatar: "👤 Avatar",
  logo: "🏷️ Logo",
};

const ASPECT_STYLE: Record<string, string> = {
  "16/9": "aspect-video",
  "9/16": "aspect-[9/16] max-h-48",
  "1/1": "aspect-square",
  "4/3": "aspect-[4/3]",
};

// ── ImageCard component ───────────────────────────────────────────────────────
function ImageCard({
  img,
  onSave,
  saving,
}: {
  img: SiteImage;
  onSave: (id: string, url: string) => Promise<void>;
  saving: boolean;
}) {
  const [url, setUrl] = useState(img.image_url);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);

  const valid = url.startsWith("http://") || url.startsWith("https://");

  return (
    <div className={`bg-white rounded-xl border p-4 flex gap-4 transition-all ${dirty ? "border-amber-400 shadow-sm" : "border-gray-100"}`}>
      {/* Thumbnail */}
      <div
        className="shrink-0 cursor-pointer relative group"
        style={{ width: img.image_type === "avatar" ? 64 : 112 }}
        onClick={() => setPreview(true)}
      >
        <div className={`${ASPECT_STYLE[img.aspect] || "aspect-video"} rounded-lg overflow-hidden bg-gray-100 border border-gray-200`}>
          <img
            src={url}
            alt={img.label_fr}
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
            onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Crect fill='%23f3f4f6' width='100' height='60'/%3E%3Ctext fill='%239ca3af' font-size='10' x='50%25' y='50%25' text-anchor='middle' dy='.35em'%3E✕%3C/text%3E%3C/svg%3E"; }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded">Aperçu</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div>
            <p className="font-bold text-[13px] text-gray-900 leading-snug">{img.label_fr}</p>
            <p className="text-[11px] text-gray-400">{img.slot}</p>
          </div>
          <span className="shrink-0 text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {TYPE_BADGE[img.image_type]}
          </span>
        </div>

        {img.notes && (
          <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">{img.notes}</p>
        )}

        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setDirty(e.target.value !== img.image_url); }}
            placeholder="https://images.unsplash.com/..."
            className="flex-1 text-[11px] font-mono border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300 min-w-0"
          />
          <button
            onClick={() => setPreview(true)}
            className="shrink-0 text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            👁
          </button>
          <button
            onClick={async () => { await onSave(img.id, url); setDirty(false); }}
            disabled={saving || !valid || !dirty}
            className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "⏳" : "💾 Sauver"}
          </button>
        </div>
        {!valid && url && (
          <p className="text-[11px] text-red-500 mt-1">URL invalide — doit commencer par https://</p>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6" onClick={() => setPreview(false)}>
          <div className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gray-100 relative">
              <img src={url} alt={img.label_fr} className="w-full max-h-[70vh] object-contain" />
            </div>
            <div className="p-4 flex justify-between items-center">
              <p className="text-[11px] text-gray-400 font-mono truncate max-w-[80%]">{url}</p>
              <button onClick={() => setPreview(false)} className="text-sm font-bold text-gray-500 hover:text-gray-800">✕ Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GalleryTileCard ───────────────────────────────────────────────────────────
function GalleryTileCard({
  tile,
  onSave,
  saving,
}: {
  tile: GalleryTile;
  onSave: (id: string, updates: Partial<GalleryTile>) => Promise<void>;
  saving: boolean;
}) {
  const [url, setUrl] = useState(tile.image_url);
  const [labelEn, setLabelEn] = useState(tile.label_en);
  const [labelFr, setLabelFr] = useState(tile.label_fr);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const valid = url.startsWith("http://") || url.startsWith("https://");

  return (
    <div className={`bg-white rounded-xl border p-4 flex gap-4 ${dirty ? "border-amber-400 shadow-sm" : "border-gray-100"}`}>
      <div className="shrink-0 w-28 cursor-pointer group" onClick={() => setPreview(true)}>
        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
          <img src={url} alt={tile.loc_en} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded">Aperçu</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">#{tile.display_order}</span>
          <span className="font-bold text-[13px] text-gray-900">{tile.loc_en} / {tile.loc_fr}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={labelEn} onChange={e => { setLabelEn(e.target.value); setDirty(true); }} placeholder="Label EN" className="text-[11px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300" />
          <input value={labelFr} onChange={e => { setLabelFr(e.target.value); setDirty(true); }} placeholder="Label FR" className="text-[11px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300" />
        </div>
        <div className="flex gap-2">
          <input value={url} onChange={e => { setUrl(e.target.value); setDirty(true); }} placeholder="https://images.unsplash.com/..." className="flex-1 text-[11px] font-mono border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300" />
          <button onClick={() => setPreview(true)} className="shrink-0 text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">👁</button>
          <button onClick={async () => { await onSave(tile.id, { image_url: url, label_en: labelEn, label_fr: labelFr }); setDirty(false); }} disabled={saving || !valid || !dirty} className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-white disabled:opacity-40 disabled:cursor-not-allowed">{saving ? "⏳" : "💾"}</button>
        </div>
      </div>
      {preview && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6" onClick={() => setPreview(false)}>
          <div className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={url} alt={tile.loc_en} className="w-full max-h-[70vh] object-contain" />
            <div className="p-4 flex justify-between"><p className="text-[11px] text-gray-400 font-mono truncate">{url}</p><button onClick={() => setPreview(false)} className="text-sm font-bold text-gray-500">✕</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WebsiteCMS() {
  const supabase = createClient();
  const [images, setImages] = useState<SiteImage[]>([]);
  const [tiles, setTiles] = useState<GalleryTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Homepage");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    Promise.all([
      supabase.from("website_images").select("*").order("page").order("section").order("slot"),
      supabase.from("gallery_tiles").select("*").order("display_order"),
    ]).then(([{ data: imgs }, { data: gal }]) => {
      setImages(imgs || []);
      setTiles(gal || []);
      setLoading(false);
    });
  }, []);

  const saveImage = async (id: string, url: string) => {
    setSaving(id);
    const { error } = await supabase.from("website_images").update({ image_url: url, updated_at: new Date().toISOString() }).eq("id", id);
    setSaving(null);
    if (error) showToast("Erreur: " + error.message, false);
    else {
      setImages(prev => prev.map(i => i.id === id ? { ...i, image_url: url } : i));
      showToast("✅ Image mise à jour — visible sur le site en quelques secondes");
    }
  };

  const saveGalleryTile = async (id: string, updates: Partial<GalleryTile>) => {
    setSaving(id);
    const { error } = await supabase.from("gallery_tiles").update(updates).eq("id", id);
    setSaving(null);
    if (error) showToast("Erreur: " + error.message, false);
    else {
      setTiles(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      showToast("✅ Quartier mis à jour — visible sur le site en quelques secondes");
    }
  };

  // Group images by page → section
  const grouped = images.reduce<Record<string, Record<string, SiteImage[]>>>((acc, img) => {
    if (!acc[img.page]) acc[img.page] = {};
    if (!acc[img.page][img.section]) acc[img.page][img.section] = [];
    acc[img.page][img.section].push(img);
    return acc;
  }, {});

  // Add gallery as a special group under Homepage
  const pages = Object.keys(grouped);
  const tabs = [...new Set([...pages, "Homepage"])];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      <p className="text-gray-400 text-sm">Chargement du CMS…</p>
    </div>
  );

  const currentImages = grouped[activeTab] || {};
  const sections = Object.entries(currentImages);
  const showGallery = activeTab === "Homepage";

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-xl text-white transition-all ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">🖼️ CMS — Images du site</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gère toutes les photos du site vitrine. Colle une URL et clique Sauver — le changement est visible instantanément.
        </p>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <strong>💡 Astuce Unsplash :</strong> Va sur <a href="https://unsplash.com/s/photos/bali" target="_blank" className="underline font-medium">unsplash.com/s/photos/bali</a> → clique une photo → clic droit → "Copier l'adresse de l'image" → colle ici. Ajoute <code className="bg-blue-100 px-1 rounded">?w=1200&q=80&auto=format&fit=crop</code> à la fin pour optimiser.
        </div>
      </div>

      {/* Page tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["Homepage", ...pages.filter(p => p !== "Homepage")].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${activeTab === tab ? "bg-amber-400 text-white border-amber-400" : "bg-white text-gray-600 border-gray-200 hover:border-amber-300"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sections.map(([section, sectionImages]) => (
          <div key={section}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-bold text-gray-800 text-base">{section}</h2>
              <span className="text-xs text-gray-400">{sectionImages.length} image{sectionImages.length > 1 ? "s" : ""}</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="space-y-3">
              {sectionImages.map(img => (
                <ImageCard key={img.id} img={img} onSave={saveImage} saving={saving === img.id} />
              ))}
            </div>
          </div>
        ))}

        {/* Gallery tiles — special section */}
        {showGallery && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-bold text-gray-800 text-base">This is where you'll live — Quartiers</h2>
              <span className="text-xs text-gray-400">{tiles.length} quartiers</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <p className="text-xs text-gray-400 mb-3">Photos de la grille galerie homepage. Tu peux aussi modifier les labels EN/FR de chaque quartier.</p>
            <div className="space-y-3">
              {tiles.map(tile => (
                <GalleryTileCard key={tile.id} tile={tile} onSave={saveGalleryTile} saving={saving === tile.id} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sections.length === 0 && !showGallery && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🖼️</p>
            <p className="font-bold text-gray-600">Aucune image configurée pour cette page</p>
            <p className="text-sm mt-1">Les images de cette page sont encore gérées directement dans le code.</p>
          </div>
        )}
      </div>

      {/* How to use Unsplash */}
      <div className="mt-10 p-5 bg-gray-50 rounded-2xl border border-gray-200">
        <h3 className="font-bold text-gray-900 text-sm mb-3">📖 Guide — Comment mettre à jour une image</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div>
            <p className="font-semibold text-gray-800 mb-2">Option A — Unsplash (recommandé)</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Va sur <a href="https://unsplash.com" target="_blank" className="text-amber-600 underline">unsplash.com</a> et cherche "Bali [sujet]"</li>
              <li>Clique sur la photo qui te convient</li>
              <li>Clic droit → "Copier l'adresse de l'image"</li>
              <li>Colle dans le champ, ajoute <code className="bg-gray-200 px-1 rounded text-[10px]">?w=1200&q=80&auto=format&fit=crop</code></li>
              <li>Clique "👁 Aperçu" pour vérifier</li>
              <li>Clique "💾 Sauver"</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-2">Option B — Ta propre photo</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Upload ta photo sur Supabase Storage (bucket "brand-assets")</li>
              <li>Copie l'URL publique depuis Supabase</li>
              <li>Colle dans le champ et sauvegarde</li>
            </ol>
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>Format recommandé :</strong><br/>
              Photos paysage : 1920×1080 min<br/>
              Photos portrait (stories) : 1080×1920<br/>
              Avatars : 400×400 carré<br/>
              Taille max : 5 MB
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
