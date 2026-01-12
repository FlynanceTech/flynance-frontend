import { NextResponse } from "next/server";
import LEGAL_DOCS from "../docs.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LegalDocs = typeof LEGAL_DOCS;
type DocKey = keyof LegalDocs;

function isDocKey(value: string): value is DocKey {
  return Object.prototype.hasOwnProperty.call(LEGAL_DOCS, value);
}

export async function GET(_req: Request, context: any) {
  try {
    // ✅ NEXT 16: params é Promise
    const { doc } = await context.params;

    console.log("[legal] doc:", doc);

    if (!doc) {
      return NextResponse.json(
        {
          message: "Documento inválido (param doc ausente).",
          availableKeys: Object.keys(LEGAL_DOCS),
        },
        { status: 400 }
      );
    }

    if (doc === "all") {
      return NextResponse.json({
        docs: Object.values(LEGAL_DOCS).map((d) => ({
          key: d.key,
          title: d.title,
          version: d.version,
          effectiveAt: d.effectiveAt,
        })),
      });
    }

    if (!isDocKey(doc)) {
      return NextResponse.json(
        {
          message: "Documento não encontrado.",
          doc,
          availableKeys: Object.keys(LEGAL_DOCS),
        },
        { status: 404 }
      );
    }

    return NextResponse.json(LEGAL_DOCS[doc], {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[legal] ERROR:", err);

    return NextResponse.json(
      {
        message: "Erro interno ao carregar documento legal.",
        error: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
