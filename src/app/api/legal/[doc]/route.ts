import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

const DOCS = {
  termos: { title: "Termos de uso", file: "legal/Termo de uso.docx" },
  privacidade: { title: "Política de privacidade (LGPD)", file: "legal/Lei geral de proteção de dados.docx" },
  cookies: { title: "Política de cookies", file: "legal/Politica de cookies.docx" },
} as const;

type DocKey = keyof typeof DOCS;

export async function GET(
  _req: Request,
  context: { params: Promise<{ doc: string }> }
) {
  const { doc } = await context.params;
  const key = doc as DocKey;

  const meta = DOCS[key];
  if (!meta) {
    return NextResponse.json({ message: "Documento não encontrado." }, { status: 404 });
  }

  const abs = path.join(process.cwd(), meta.file);

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(abs);
  } catch {
    return NextResponse.json(
      { message: "Arquivo não encontrado no servidor.", file: meta.file },
      { status: 404 }
    );
  }

  // ✅ Buffer (Node) -> Uint8Array (Web BodyInit compatível)
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `inline; filename="${encodeURIComponent(meta.title)}.docx"`,
      "Cache-Control": "no-store",
      "X-Doc-Title": meta.title,
    },
  });
}
