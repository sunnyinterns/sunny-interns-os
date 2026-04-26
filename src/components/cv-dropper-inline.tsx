"use client";
import { useState, useRef } from "react";

interface Extracted {
  first_name?: string; last_name?: string; email?: string;
  phone?: string; school?: string; english_level?: string;
}

interface Props {
  lang: "fr" | "en";
  onComplete: (data: Extracted, cvUrl: string) => void;
}

export function CVDropperInline({ lang, onComplete }: Props) {
  const [state, setState] = useState<"idle"|"uploading"|"done"|"error">("idle");
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!file) return;
    const allowed = ["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      setState("error"); return;
    }
    setState("uploading");
    const fd = new FormData();
    fd.append("cv", file);
    try {
      const res = await fetch("/api/cv-drop", { method: "POST", body: fd });
      const data = await res.json() as { extracted?: Extracted; cv_url?: string; error?: string };
      if (data.error || !data.extracted) { setState("error"); return; }
      setExtracted(data.extracted ?? {});
      setState("done");
      setTimeout(() => onComplete(data.extracted ?? {}, data.cv_url ?? ""), 800);
    } catch { setState("error"); }
  }

  const t = (fr: string, en: string) => lang === "fr" ? fr : en;

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      onClick={() => state === "idle" && inputRef.current?.click()}
      className={`w-full rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
        dragOver ? "border-amber-400 bg-amber-50" :
        state === "done" ? "border-green-400 bg-green-50" :
        state === "error" ? "border-red-300 bg-red-50" :
        "border-zinc-300 bg-zinc-50 hover:border-amber-400 hover:bg-amber-50"
      }`}
    >
      <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      
      {state === "idle" && (
        <>
          <div className="text-3xl mb-3">📄</div>
          <p className="font-body font-bold text-zinc-700 mb-1">{t("Glisse ton CV ici", "Drop your CV here")}</p>
          <p className="font-body text-sm text-zinc-400">{t("PDF ou DOCX — max 10 Mo", "PDF or DOCX — max 10 MB")}</p>
        </>
      )}
      {state === "uploading" && (
        <>
          <div className="text-2xl mb-2 animate-pulse">⏳</div>
          <p className="font-body text-sm text-zinc-500">{t("Lecture du CV en cours...", "Reading your CV...")}</p>
        </>
      )}
      {state === "done" && extracted && (
        <>
          <div className="text-2xl mb-2">✅</div>
          <p className="font-body font-bold text-green-700 mb-1">{t("CV analysé !", "CV analyzed!")}</p>
          <p className="font-body text-xs text-green-600">
            {[extracted.first_name, extracted.last_name, extracted.email].filter(Boolean).join(" · ")}
          </p>
        </>
      )}
      {state === "error" && (
        <>
          <div className="text-2xl mb-2">⚠️</div>
          <p className="font-body text-sm text-red-600">{t("Erreur — réessaie avec un PDF ou DOCX", "Error — try again with PDF or DOCX")}</p>
          <button onClick={e => { e.stopPropagation(); setState("idle"); }} className="mt-2 text-xs text-zinc-500 underline bg-transparent border-none cursor-pointer">
            {t("Réessayer", "Try again")}
          </button>
        </>
      )}
    </div>
  );
}
