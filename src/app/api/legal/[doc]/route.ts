import { NextResponse } from "next/server";
import LEGAL_DOCS from "../docs.json";

type LegalDocs = typeof LEGAL_DOCS;
type DocKey = keyof LegalDocs;

function isDocKey(value: string): value is DocKey {
  return value in LEGAL_DOCS;
}

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ doc: string }> }
) {
  // ✅ em runtime, mesmo se params não for Promise, `await` ainda funciona.
  const { doc: rawDoc } = await (params as any);

  const doc = String(rawDoc || "").toLowerCase();

  if (!doc) {
    return NextResponse.json(
      {
        message: "Documento inválido.",
        doc,
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
      "X-Doc-Title": payload.title ?? "",
      "X-Doc-Version": payload.version ?? "",
    },
  });
}
