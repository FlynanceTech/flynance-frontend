import Link from "next/link";
import legalDocs from "@/app/api/legal/docs.json";

export type LegalDocKey = "termos" | "privacidade" | "cookies";

type LegalDocBlock =
  | { type: "p" | "h2" | "h3"; text: string }
  | { type: "ul"; items: string[] };

type LegalDoc = {
  title: string;
  version?: string;
  effectiveAt?: string;
  content: string | LegalDocBlock[];
};

/** Página pública de documento legal (Termos/Privacidade/Cookies), renderizada
 *  a partir do docs.json (fonte da verdade), estática e indexável. */
export default function LegalDocView({ docKey }: { docKey: LegalDocKey }) {
  const doc = legalDocs[docKey] as LegalDoc;

  return (
    <main className="mx-auto w-full max-w-[820px] px-6 py-12">
      <Link href="/" className="text-sm text-primary underline underline-offset-2">
        ← Voltar para a Flynance
      </Link>

      <header className="mt-6 mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{doc.title}</h1>
        {(doc.version || doc.effectiveAt) && (
          <p className="mt-2 text-xs text-slate-500">
            {doc.version ? `Versão ${doc.version}` : ""}
            {doc.version && doc.effectiveAt ? " • " : ""}
            {doc.effectiveAt ? `Vigente desde ${doc.effectiveAt}` : ""}
          </p>
        )}
      </header>

      <article className="space-y-3">
        <LegalDocContent content={doc.content} />
      </article>

      <footer className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
        <div className="flex flex-wrap gap-4">
          <Link href="/termos" className="text-primary underline underline-offset-2">Termos de Uso</Link>
          <Link href="/privacidade" className="text-primary underline underline-offset-2">Política de Privacidade</Link>
          <Link href="/cookies" className="text-primary underline underline-offset-2">Política de Cookies</Link>
        </div>
      </footer>
    </main>
  );
}

function LegalDocContent({ content }: { content: LegalDoc["content"] }) {
  if (typeof content === "string") {
    return (
      <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-700">
        {content}
      </pre>
    );
  }

  return (
    <>
      {content.map((block, idx) => {
        switch (block.type) {
          case "h2":
            return (
              <h2 key={idx} className="pt-4 text-base font-semibold text-slate-900">
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={idx} className="pt-2 text-sm font-semibold text-slate-800">
                {block.text}
              </h3>
            );
          case "p":
            return (
              <p key={idx} className="text-sm leading-6 text-slate-700">
                {block.text}
              </p>
            );
          case "ul":
            return (
              <ul key={idx} className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                {block.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
