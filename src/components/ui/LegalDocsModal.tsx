"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

export type LegalDocKey = "termos" | "privacidade" | "cookies";

type Props = {
  open: boolean;
  initialDoc?: LegalDocKey; // qual aba começa ao abrir
  onClose: () => void;
};

const DOCS: Record<LegalDocKey, { title: string; tabLabel: string }> = {
  termos: { title: "Termos de uso", tabLabel: "Termos" },
  privacidade: { title: "Política de privacidade (LGPD)", tabLabel: "Privacidade (LGPD)" },
  cookies: { title: "Política de cookies", tabLabel: "Cookies" },
};

export default function LegalDocsModal({ open, initialDoc = "termos", onClose }: Props) {
  const [activeDoc, setActiveDoc] = useState<LegalDocKey>(initialDoc);

  const tabs = useMemo(
    () =>
      (Object.keys(DOCS) as LegalDocKey[]).map((key) => ({
        key,
        label: DOCS[key].tabLabel,
      })),
    []
  );

  // reseta aba quando abrir
  useEffect(() => {
    if (!open) return;
    setActiveDoc(initialDoc);
  }, [open, initialDoc]);

  // fecha no ESC
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const title = DOCS[activeDoc]?.title ?? "Documentos legais";

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="Documentos legais">
      {/* overlay */}
      <button
        aria-label="Fechar"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        type="button"
      />

      {/* modal */}
      <div className="absolute left-1/2 top-1/2 w-[min(920px,92vw)] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl bg-white shadow-[0_25px_80px_rgba(0,0,0,0.35)] border border-slate-200 overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Documentos legais</p>
              <h2 className="text-lg font-semibold text-slate-800 truncate">{title}</h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full border border-slate-200 grid place-items-center hover:bg-slate-50"
              aria-label="Fechar modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* tabs */}
          <div className="px-5 pt-4">
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
              {tabs.map((t) => (
                <TabButton
                  key={t.key}
                  active={t.key === activeDoc}
                  label={t.label}
                  onClick={() => setActiveDoc(t.key)}
                />
              ))}
            </div>

            <p className="mt-2 text-xs text-slate-500">Role para ler. Você pode fechar com ESC.</p>
          </div>

          {/* content */}
          <div className="px-5 pb-5 pt-4">
            <div className="h-[65vh] overflow-hidden rounded-xl border border-slate-200 bg-white">
              <DocxViewer doc={activeDoc} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "px-3 py-2 text-sm font-semibold transition",
        active ? "bg-primary text-white" : "bg-white text-slate-700 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

function DocxViewer({ doc }: { doc: LegalDocKey }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(`/api/legal/${doc}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Falha ao carregar documento (${res.status}).`);

        const arrayBuffer = await res.arrayBuffer();

        const mod = await import("docx-preview");
        const { renderAsync } = mod;

        if (!ref.current) return;

        ref.current.innerHTML = "";

        await renderAsync(arrayBuffer, ref.current, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          // useMathML: false, // se precisar
        });

        if (!cancelled) setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? "Erro ao renderizar documento.");
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [doc]);

  return (
    <div className="relative h-full">
      {loading && (
        <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-sm p-4">
          <p className="text-sm font-semibold text-slate-700">Preparando documento…</p>
          <p className="text-xs text-slate-500 mt-1">Isso pode levar alguns segundos.</p>

          <div className="mt-4 space-y-3">
            <div className="h-4 w-2/3 bg-slate-100 rounded" />
            <div className="h-4 w-1/2 bg-slate-100 rounded" />
            <div className="h-4 w-5/6 bg-slate-100 rounded" />
            <div className="h-4 w-4/6 bg-slate-100 rounded" />
          </div>
        </div>
      )}

      <div className="h-full overflow-auto p-4">
        {err ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        ) : (
          <div ref={ref} className="docx" />
        )}
      </div>
    </div>
  );
}
