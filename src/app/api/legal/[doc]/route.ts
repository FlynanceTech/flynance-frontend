import { NextResponse } from "next/server";
import LEGAL_DOCS from "../docs.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LegalDocs = typeof LEGAL_DOCS;
type DocKey = keyof LegalDocs;

function isDocKey(value: string): value is DocKey {
  return Object.prototype.hasOwnProperty.call(LEGAL_DOCS, value);
}

export async function GET(
  _req: Request,
  context: { params: { doc: string } }
) {
  try {
    const doc = context?.params?.doc;

    // ✅ debug seguro (aparece em logs da Vercel)
    console.log("[legal] doc:", doc, "keys:", Object.keys(LEGAL_DOCS));

    if (!doc) {
      return NextResponse.json(
        {
          message: "Documento inválido (param doc ausente).",
          availableKeys: Object.keys(LEGAL_DOCS),
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (doc === "all") {
      return NextResponse.json(
        {
          docs: Object.values(LEGAL_DOCS).map((d) => ({
            key: d.key,
            title: d.title,
            version: d.version,
            effectiveAt: d.effectiveAt,
          })),
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!isDocKey(doc)) {
      return NextResponse.json(
        {
          message: "Documento não encontrado.",
          doc,
          availableKeys: Object.keys(LEGAL_DOCS),
        },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const payload = LEGAL_DOCS[doc];

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
        "X-Doc-Title": String(payload.title ?? ""),
        "X-Doc-Version": String(payload.version ?? ""),
      },
    });
  } catch (err: any) {
    console.error("[legal] ERROR:", err);

    // ✅ em produção você consegue ver o motivo do 500 no response
    return NextResponse.json(
      {
        message: "Erro ao carregar documento legal.",
        error: err?.message ?? String(err),
        availableKeys: Object.keys(LEGAL_DOCS),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
