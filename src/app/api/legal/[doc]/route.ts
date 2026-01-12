import { NextResponse } from "next/server";
import LEGAL_DOCS from "./docs.json"; // ajuste o alias/caminho

type LegalDocs = typeof LEGAL_DOCS;
type DocKey = keyof LegalDocs;

function isDocKey(value: string): value is DocKey {
  return value in LEGAL_DOCS;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ doc: string }> }
) {
  const { doc } = await context.params;

  if (doc === "all") {
    return NextResponse.json(
      {
        docs: Object.values(LEGAL_DOCS).map((d) => ({
          key: d.key,
          title: d.title,
          version: d.version,
          effectiveAt: d.effectiveAt
        }))
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!isDocKey(doc)) {
    return NextResponse.json(
      { message: "Documento não encontrado.", doc },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const payload = LEGAL_DOCS[doc];

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      "X-Doc-Title": payload.title,
      "X-Doc-Version": payload.version
    }
  });
}
