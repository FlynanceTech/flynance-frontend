"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

export type LegalDocKey = "termos" | "privacidade" | "cookies";

type Props = {
  open: boolean;
  initialDoc?: LegalDocKey;
  onClose: () => void;
};

const DOCS: Record<LegalDocKey, { title: string; tabLabel: string }> = {
  termos: { title: "Termos de uso", tabLabel: "Termos" },
  privacidade: { title: "Política de privacidade (LGPD)", tabLabel: "Privacidade (LGPD)" },
  cookies: { title: "Política de cookies", tabLabel: "Cookies" },
};

/** ===== Types do JSON ===== */
type LegalDocBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] };

type LegalDocPayload = {
  key: LegalDocKey;
  title: string;
  version?: string;
  effectiveAt?: string;
  content: string | LegalDocBlock[];
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
              <LegalDocViewer doc={activeDoc} />
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

function LegalDocViewer({ doc }: { doc: LegalDocKey }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<LegalDocPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);
      setData(null);

      try {
        const res = await fetch(`/api/legal/${doc}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Falha ao carregar documento (${res.status}).`);

        const json = (await res.json()) as LegalDocPayload;

        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? "Erro ao carregar documento.");
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
          <p className="text-sm font-semibold text-slate-700">Carregando documento…</p>
          <p className="text-xs text-slate-500 mt-1">Isso deve ser rápido.</p>

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
        ) : data ? (
          <div className="mx-auto max-w-[760px]">
            {/* meta */}
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-slate-900">{data.title}</h3>

              {(data.version || data.effectiveAt) && (
                <p className="mt-1 text-xs text-slate-500">
                  {data.version ? `Versão ${data.version}` : ""}
                  {data.version && data.effectiveAt ? " • " : ""}
                  {data.effectiveAt ? `Vigente desde ${data.effectiveAt}` : ""}
                </p>
              )}
            </div>

            {/* content */}
            <LegalDocContent content={data.content} />
          </div>
        ) : (
          <div className="text-sm text-slate-500">Nenhum conteúdo.</div>
        )}
      </div>
    </div>
  );
}

function LegalDocContent({ content }: { content: LegalDocPayload["content"] }) {
  // Fallback: caso seu JSON ainda venha como string gigante
  if (typeof content === "string") {
    return (
      <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700 font-sans">
        {content}
      </pre>
    );
  }

  return (
    <div className="space-y-3">
      {content.map((block, idx) => {
        switch (block.type) {
          case "h2":
            return (
              <h4 key={idx} className="pt-3 text-base font-semibold text-slate-900">
                {block.text}
              </h4>
            );

          case "h3":
            return (
              <h5 key={idx} className="pt-2 text-sm font-semibold text-slate-800">
                {block.text}
              </h5>
            );

          case "p":
            return (
              <p key={idx} className="text-sm leading-6 text-slate-700">
                {block.text}
              </p>
            );

          case "ul":
            return (
              <ul key={idx} className="list-disc pl-5 text-sm leading-6 text-slate-700 space-y-1">
                {block.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
