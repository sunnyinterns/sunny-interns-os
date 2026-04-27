"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────
type PageStatus = "draft" | "review" | "validated" | "live";

interface CmsPage {
  id: string; name_fr: string; name_en: string; path: string;
  status: PageStatus; notes: string | null;
  validated_at: string | null; validated_by: string | null;
}

interface CmsSection {
  id: string; page_id: string; section_key: string; label_fr: string;
  display_order: number; bg_type: "color" | "image" | "none";
  bg_color: string; bg_image_url: string | null; bg_overlay: number;
  enabled: boolean;
}

interface SiteImage {
  id: string; page: string; section: string; slot: string;
  label_fr: string; image_url: string; image_type: string;
  aspect: string; notes: string | null;
}

interface GalleryTile {
  id: string; loc_en: string; loc_fr: string;
  label_en: string; label_fr: string; image_url: string;
  display_order: number; is_active: boolean;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS: Record<PageStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: "Brouillon",  color: "text-gray-500",   bg: "bg-gray-100" },
  review:    { label: "En révision",color: "text-amber-600",  bg: "bg-amber-100" },
  validated: { label: "Validé ✓",  color: "text-emerald-600",bg: "bg-emerald-100" },
  live:      { label: "En ligne 🟢",color: "text-blue-600",   bg: "bg-blue-100" },
};

const BG_PRESETS = [
  { label: "Crème clair", value: "#FAFAF8" },
  { label: "Crème", value: "#F5F0E8" },
  { label: "Blanc", value: "#FFFFFF" },
  { label: "Charcoal", value: "#1a1918" },
  { label: "Jaune primaire", value: "#FFCC00" },
  { label: "Amber clair", value: "#FFFBF0" },
];

// ── SectionRow component ──────────────────────────────────────────────────────
function SectionRow({ sec, images, tiles, onSaveSection, onSaveImage, onSaveTile, saving }: {
  sec: CmsSection;
  images: SiteImage[];
  tiles: GalleryTile[];
  onSaveSection: (id: string, patch: Partial<CmsSection>) => Promise<void>;
  onSaveImage: (id: string, url: string) => Promise<void>;
  onSaveTile: (id: string, patch: Partial<GalleryTile>) => Promise<void>;
  saving: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState({ ...sec });
  const [dirty, setDirty] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const set = (patch: Partial<CmsSection>) => { setLocal(p => ({ ...p, ...patch })); setDirty(true); };

  const save = async () => { await onSaveSection(sec.id, local); setDirty(false); };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${local.enabled ? "border-gray-200" : "border-dashed border-gray-200 opacity-60"}`}>
      {/* Section header */}
      <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none ${open ? "bg-gray-50" : "bg-white"} hover:bg-gray-50 transition-colors`}
        onClick={() => setOpen(o => !o)}>
        <span className="text-xs font-bold text-gray-400 w-5 text-center">{sec.display_order}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[13px] text-gray-900 leading-none">{sec.label_fr}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{sec.section_key}</p>
        </div>
        {/* BG badge */}
        <div className="flex items-center gap-1.5">
          {sec.bg_type === "color" && (
            <div className="w-5 h-5 rounded-full border border-gray-200 shadow-sm shrink-0"
              style={{ background: local.bg_color }} />
          )}
          {sec.bg_type === "image" && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">📷 Image</span>}
          {sec.bg_type === "none" && <span className="text-[10px] text-gray-400">Transparent</span>}
        </div>
        {dirty && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">modifié</span>}
        <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={local.enabled} onChange={e => set({ enabled: e.target.checked })}
            className="rounded w-3 h-3" />
          Visible
        </label>
        <span className={`transition-transform text-gray-400 ${open ? "rotate-180" : ""}`}>▾</span>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white p-5 space-y-5">
          {/* ── Background ── */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-3">Arrière-plan</p>
            <div className="flex gap-2 mb-3">
              {(["color","image","none"] as const).map(t => (
                <button key={t} onClick={() => set({ bg_type: t })}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${local.bg_type === t ? "bg-amber-400 border-amber-400 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                  {t === "color" ? "🎨 Couleur" : t === "image" ? "📷 Image" : "⬜ Aucun"}
                </button>
              ))}
            </div>

            {local.bg_type === "color" && (
              <div className="flex flex-wrap gap-2 items-center">
                {BG_PRESETS.map(p => (
                  <button key={p.value} title={p.label} onClick={() => set({ bg_color: p.value })}
                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${local.bg_color === p.value ? "border-amber-500 scale-110" : "border-gray-200"}`}
                    style={{ background: p.value }} />
                ))}
                <div className="flex items-center gap-2 ml-2">
                  <input type="color" value={local.bg_color || "#FAFAF8"}
                    onChange={e => set({ bg_color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                  <input value={local.bg_color || ""} onChange={e => set({ bg_color: e.target.value })}
                    placeholder="#FAFAF8" className="text-[11px] font-mono border border-gray-200 rounded-lg px-2 py-1.5 w-24 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
              </div>
            )}

            {local.bg_type === "image" && (
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <input value={local.bg_image_url || ""} onChange={e => set({ bg_image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 text-[11px] font-mono border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  <button onClick={() => setPreviewUrl(local.bg_image_url)}
                    className="text-[11px] px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">👁</button>
                </div>
                {local.bg_image_url && (
                  <div className="relative rounded-lg overflow-hidden h-20 bg-gray-100">
                    <img src={local.bg_image_url} alt="bg" className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${local.bg_overlay})` }} />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-500 shrink-0">Overlay obscurité :</span>
                  <input type="range" min="0" max="1" step="0.05" value={local.bg_overlay}
                    onChange={e => set({ bg_overlay: parseFloat(e.target.value) })}
                    className="flex-1 accent-amber-500" />
                  <span className="text-[11px] font-mono text-gray-600 w-8">{Math.round(local.bg_overlay * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Médias liés à cette section ── */}
          {images.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-3">Médias de cette section ({images.length})</p>
              <div className="space-y-2.5">
                {images.map(img => (
                  <ImageSlot key={img.id} img={img} onSave={onSaveImage} saving={saving === img.id} />
                ))}
              </div>
            </div>
          )}

          {/* ── Tiles galerie ── */}
          {tiles.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-3">Photos quartiers ({tiles.length})</p>
              <div className="space-y-2">
                {tiles.map(tile => (
                  <TileSlot key={tile.id} tile={tile} onSave={onSaveTile} saving={saving === tile.id} />
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button onClick={save} disabled={!dirty || saving === sec.id}
              className="text-[12px] font-bold px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {saving === sec.id ? "⏳ Sauvegarde..." : "💾 Sauvegarder la section"}
            </button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6" onClick={() => setPreviewUrl(null)}>
          <div className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={previewUrl} alt="Preview" className="w-full max-h-[70vh] object-contain" />
            <div className="p-4 flex justify-end"><button onClick={() => setPreviewUrl(null)} className="text-sm font-bold text-gray-500">✕ Fermer</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ImageSlot ─────────────────────────────────────────────────────────────────
function ImageSlot({ img, onSave, saving }: { img: SiteImage; onSave: (id: string, url: string) => Promise<void>; saving: boolean }) {
  const [url, setUrl] = useState(img.image_url);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  return (
    <div className={`flex gap-3 items-center bg-gray-50 rounded-lg p-3 ${dirty ? "ring-1 ring-amber-300" : ""}`}>
      <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0 cursor-pointer" onClick={() => setPreview(true)}>
        <img src={url} alt={img.label_fr} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-gray-800 leading-none mb-1">{img.label_fr}</p>
        <p className="text-[10px] text-gray-400 mb-1.5">{img.image_type === "avatar" ? "👤 Avatar 1:1" : img.image_type === "photo" ? `📷 Photo ${img.aspect}` : img.image_type}</p>
        <div className="flex gap-1.5">
          <input value={url} onChange={e => { setUrl(e.target.value); setDirty(e.target.value !== img.image_url); }}
            className="flex-1 text-[10px] font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-300 min-w-0" />
          <button onClick={() => setPreview(true)} className="text-[10px] px-1.5 py-1 border border-gray-200 rounded text-gray-400 hover:text-gray-600">👁</button>
          <button onClick={async () => { await onSave(img.id, url); setDirty(false); }} disabled={saving || !dirty}
            className="text-[10px] font-bold px-2 py-1 rounded bg-amber-400 hover:bg-amber-500 text-white disabled:opacity-40">
            {saving ? "⏳" : "💾"}
          </button>
        </div>
      </div>
      {preview && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6" onClick={() => setPreview(false)}>
          <div className="max-w-xl w-full bg-white rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={url} alt={img.label_fr} className="w-full max-h-[60vh] object-contain" />
            <div className="p-3 flex justify-between">
              <p className="text-[10px] text-gray-400 font-mono truncate">{url}</p>
              <button onClick={() => setPreview(false)} className="text-xs font-bold text-gray-500">✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TileSlot ──────────────────────────────────────────────────────────────────
function TileSlot({ tile, onSave, saving }: { tile: GalleryTile; onSave: (id: string, patch: Partial<GalleryTile>) => Promise<void>; saving: boolean }) {
  const [url, setUrl] = useState(tile.image_url);
  const [lEn, setLEn] = useState(tile.label_en);
  const [lFr, setLFr] = useState(tile.label_fr);
  const dirty = url !== tile.image_url || lEn !== tile.label_en || lFr !== tile.label_fr;
  return (
    <div className={`flex gap-3 items-center bg-gray-50 rounded-lg p-3 ${dirty ? "ring-1 ring-amber-300" : ""}`}>
      <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-200 shrink-0">
        <img src={url} alt={tile.loc_en} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">#{tile.display_order}</span>
          <span className="text-[12px] font-semibold text-gray-800">{tile.loc_en}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <input value={lEn} onChange={e => setLEn(e.target.value)} placeholder="Label EN"
            className="text-[10px] border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-300" />
          <input value={lFr} onChange={e => setLFr(e.target.value)} placeholder="Label FR"
            className="text-[10px] border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-300" />
        </div>
        <div className="flex gap-1.5">
          <input value={url} onChange={e => setUrl(e.target.value)}
            className="flex-1 text-[10px] font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-300 min-w-0" />
          <button onClick={async () => { await onSave(tile.id, { image_url: url, label_en: lEn, label_fr: lFr }); }}
            disabled={saving || !dirty}
            className="text-[10px] font-bold px-2 py-1 rounded bg-amber-400 hover:bg-amber-500 text-white disabled:opacity-40">
            {saving ? "⏳" : "💾"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main CMS page ─────────────────────────────────────────────────────────────
export default function WebsiteCMS() {
  const supabase = createClient();
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [images, setImages] = useState<SiteImage[]>([]);
  const [tiles, setTiles] = useState<GalleryTile[]>([]);
  const [activePage, setActivePage] = useState<string>("homepage");
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageNotes, setPageNotes] = useState<string>("");
  const [noteDirty, setNoteDirty] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    Promise.all([
      supabase.from("cms_pages").select("*").order("name_fr"),
      supabase.from("cms_sections").select("*").order("display_order"),
      supabase.from("website_images").select("*").order("section").order("slot"),
      supabase.from("gallery_tiles").select("*").order("display_order"),
    ]).then(([{ data: p }, { data: s }, { data: i }, { data: g }]) => {
      setPages(p || []);
      setSections(s || []);
      setImages(i || []);
      setTiles(g || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const pg = pages.find(p => p.id === activePage);
    setPageNotes(pg?.notes || "");
    setNoteDirty(false);
  }, [activePage, pages]);

  const currentPage = pages.find(p => p.id === activePage);
  const currentSections = sections.filter(s => s.page_id === activePage).sort((a, b) => a.display_order - b.display_order);

  const savePageStatus = async (id: string, status: PageStatus) => {
    const patch: Partial<CmsPage> = { status };
    if (status === "validated") { patch.validated_at = new Date().toISOString(); patch.validated_by = "admin"; }
    await supabase.from("cms_pages").update(patch).eq("id", id);
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
    showToast(`✅ Page "${currentPage?.name_fr}" → ${STATUS[status].label}`);
  };

  const savePageNotes = async () => {
    await supabase.from("cms_pages").update({ notes: pageNotes }).eq("id", activePage);
    setPages(prev => prev.map(p => p.id === activePage ? { ...p, notes: pageNotes } : p));
    setNoteDirty(false);
    showToast("✅ Notes sauvegardées");
  };

  const saveSection = async (id: string, patch: Partial<CmsSection>) => {
    setSaving(id);
    await supabase.from("cms_sections").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    setSaving(null);
    showToast("✅ Section mise à jour");
  };

  const saveImage = async (id: string, url: string) => {
    setSaving(id);
    await supabase.from("website_images").update({ image_url: url, updated_at: new Date().toISOString() }).eq("id", id);
    setImages(prev => prev.map(i => i.id === id ? { ...i, image_url: url } : i));
    setSaving(null);
    showToast("✅ Image mise à jour — visible sur le site instantanément");
  };

  const saveTile = async (id: string, patch: Partial<GalleryTile>) => {
    setSaving(id);
    await supabase.from("gallery_tiles").update(patch).eq("id", id);
    setTiles(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    setSaving(null);
    showToast("✅ Quartier mis à jour");
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen gap-3">
      <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
      <span className="text-gray-400 text-sm">Chargement du CMS…</span>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-xl text-white ${toast.ok ? "bg-emerald-600" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* ── SIDEBAR — Pages ── */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
        <div className="px-4 py-5 border-b border-gray-100">
          <h1 className="font-bold text-gray-900 text-base">🖥️ CMS Vitrine</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Pages & sections</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {pages.map(pg => {
            const st = STATUS[pg.status];
            return (
              <button key={pg.id} onClick={() => setActivePage(pg.id)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-colors ${activePage === pg.id ? "bg-amber-50 border-r-2 border-amber-500" : "hover:bg-gray-50"}`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold leading-none truncate ${activePage === pg.id ? "text-amber-700" : "text-gray-800"}`}>{pg.name_fr}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{pg.path}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${st.bg} ${st.color}`}>
                  {pg.status === "validated" ? "✓" : pg.status === "live" ? "🟢" : pg.status === "review" ? "…" : "○"}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="text-[10px] text-gray-400 space-y-0.5">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" /> Brouillon</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" /> En révision</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Validé</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> En ligne</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN — Page detail ── */}
      <main className="flex-1 overflow-y-auto">
        {currentPage && (
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

            {/* Page header */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{currentPage.name_fr}</h2>
                  <p className="text-sm text-gray-400 font-mono mt-0.5">
                    <a href={`https://bali-interns-website.vercel.app${currentPage.path}`} target="_blank"
                      className="hover:text-amber-600 transition-colors no-underline">
                      bali-interns.com{currentPage.path} ↗
                    </a>
                  </p>
                  {currentPage.validated_at && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Validé le {new Date(currentPage.validated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
                {/* Status selector */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Statut</p>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {(Object.keys(STATUS) as PageStatus[]).map(s => {
                      const st = STATUS[s];
                      return (
                        <button key={s} onClick={() => savePageStatus(currentPage.id, s)}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all ${currentPage.status === s ? `${st.bg} ${st.color} border-transparent` : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Notes internes</label>
                <textarea value={pageNotes} onChange={e => { setPageNotes(e.target.value); setNoteDirty(true); }}
                  placeholder="Notes de révision, points bloquants, corrections en attente…"
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" />
                {noteDirty && (
                  <div className="flex justify-end mt-1.5">
                    <button onClick={savePageNotes}
                      className="text-[11px] font-bold px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-white rounded-lg transition-colors">
                      Sauvegarder les notes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sections */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-700 text-sm">Sections ({currentSections.length})</h3>
                <p className="text-[11px] text-gray-400">Cliquez sur une section pour la modifier</p>
              </div>
              <div className="space-y-2">
                {currentSections.map(sec => {
                  const secImages = images.filter(i =>
                    i.section.toLowerCase().replace(/\s/g, "_").includes(sec.section_key) ||
                    i.id.includes(sec.page_id + "." + sec.section_key.split(".").pop())
                  );
                  const secTiles = sec.section_key === "gallery" ? tiles : [];
                  return (
                    <SectionRow key={sec.id} sec={sec}
                      images={secImages}
                      tiles={secTiles}
                      onSaveSection={saveSection}
                      onSaveImage={saveImage}
                      onSaveTile={saveTile}
                      saving={saving} />
                  );
                })}
                {currentSections.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="font-semibold text-gray-600 text-sm">Aucune section configurée pour cette page</p>
                  </div>
                )}
              </div>
            </div>

            {/* Media library for this page */}
            {images.filter(i => i.page === currentPage.name_en || i.id.startsWith(activePage)).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-700 text-sm mb-4">
                  🖼️ Médiathèque — {currentPage.name_fr}
                  <span className="ml-2 text-[11px] font-normal text-gray-400">
                    ({images.filter(i => i.id.startsWith(activePage)).length} médias)
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {images.filter(i => i.id.startsWith(activePage)).map(img => (
                    <ImageSlot key={img.id} img={img} onSave={saveImage} saving={saving === img.id} />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
