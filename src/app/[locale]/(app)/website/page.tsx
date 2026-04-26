"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

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

export default function WebsiteGalleryManager() {
  const [tiles, setTiles] = useState<GalleryTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("gallery_tiles").select("*").order("display_order")
      .then(({ data }) => { setTiles(data || []); setLoading(false); });
  }, []);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const updateField = (id: string, field: keyof GalleryTile, value: string) => {
    setTiles(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const save = async (tile: GalleryTile) => {
    setSaving(tile.id);
    const { error } = await supabase.from("gallery_tiles").update({
      label_en: tile.label_en,
      label_fr: tile.label_fr,
      image_url: tile.image_url,
      is_active: tile.is_active,
    }).eq("id", tile.id);
    setSaving(null);
    if (error) showToast("Erreur: " + error.message, false);
    else showToast(`✅ ${tile.loc_en} sauvegardé`);
  };

  const isValidUrl = (url: string) =>
    url.startsWith("http://") || url.startsWith("https://");

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-lg text-white transition-all ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">🖼️ Gallery — This is where you'll live</h1>
        <p className="text-gray-500 text-sm mt-1">
          Modifie les photos et labels de la section gallery sur le site vitrine. Chaque changement est live immédiatement.
        </p>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <strong>Comment ça marche :</strong> Colle une URL Unsplash ou une URL directe vers ta photo. 
          Clique "Aperçu" pour vérifier, puis "Sauvegarder". La photo sera mise à jour sur le site dans les secondes qui suivent.
        </div>
      </div>

      <div className="grid gap-4">
        {tiles.map((tile) => (
          <div key={tile.id} className={`bg-white rounded-2xl border p-5 ${tile.is_active ? "border-gray-200" : "border-dashed border-gray-300 opacity-60"}`}>
            <div className="flex gap-5">
              {/* Current photo preview */}
              <div className="shrink-0">
                <div className="w-32 h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  <img
                    src={tile.image_url}
                    alt={tile.loc_en}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.png"; }}
                  />
                </div>
                <div className="mt-2 flex justify-center">
                  <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                    <input type="checkbox" checked={tile.is_active}
                      onChange={e => updateField(tile.id, "is_active" as any, e.target.checked as any)}
                      className="rounded" />
                    Visible
                  </label>
                </div>
              </div>

              {/* Fields */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Location + order badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                    #{tile.display_order}
                  </span>
                  <span className="font-bold text-gray-900">{tile.loc_en}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-600 text-sm">{tile.loc_fr}</span>
                </div>

                {/* Labels */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Label EN</label>
                    <input value={tile.label_en}
                      onChange={e => updateField(tile.id, "label_en", e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Label FR</label>
                    <input value={tile.label_fr}
                      onChange={e => updateField(tile.id, "label_fr", e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">URL de la photo</label>
                  <div className="flex gap-2">
                    <input value={tile.image_url}
                      onChange={e => updateField(tile.id, "image_url", e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono text-xs"
                    />
                    <button onClick={() => setPreview(tile.image_url)}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      👁 Aperçu
                    </button>
                  </div>
                  {!isValidUrl(tile.image_url) && tile.image_url && (
                    <p className="text-xs text-red-500 mt-1">URL invalide — doit commencer par https://</p>
                  )}
                </div>
              </div>

              {/* Save button */}
              <div className="shrink-0 flex items-start pt-6">
                <button
                  onClick={() => save(tile)}
                  disabled={saving === tile.id || !isValidUrl(tile.image_url)}
                  className="text-sm font-bold px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {saving === tile.id ? "⏳..." : "💾 Sauver"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How to find Unsplash URLs */}
      <div className="mt-8 p-5 bg-gray-50 rounded-2xl border border-gray-200">
        <h3 className="font-bold text-gray-900 text-sm mb-2">💡 Comment trouver une bonne photo Unsplash</h3>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Va sur <a href="https://unsplash.com/s/photos/bali" target="_blank" className="text-amber-600 hover:underline font-medium">unsplash.com/s/photos/bali</a></li>
          <li>Clique sur une photo qui te convient</li>
          <li>Clic droit sur la photo → "Copier l'adresse de l'image"</li>
          <li>Ajoute <code className="bg-gray-200 px-1 rounded">?w=1200&q=80&auto=format&fit=crop</code> à la fin</li>
          <li>Colle l'URL dans le champ et clique Sauver</li>
        </ol>
        <div className="mt-3 text-xs text-gray-500">
          💡 Tu peux aussi coller n'importe quelle URL directe vers une image (Cloudinary, S3, etc.)
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setPreview(null)}>
          <div className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="aspect-[16/9] bg-gray-100">
              <img src={preview} alt="Preview" className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).alt = "Image non accessible"; }} />
            </div>
            <div className="p-4 flex justify-between items-center">
              <p className="text-xs text-gray-500 font-mono truncate max-w-[80%]">{preview}</p>
              <button onClick={() => setPreview(null)}
                className="text-sm font-bold text-gray-600 hover:text-gray-900">Fermer ✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
