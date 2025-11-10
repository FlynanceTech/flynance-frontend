// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { z } from 'zod';

// ✅ garantir Node runtime (googleapis não roda em edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ➜ use a credencial que você já tem
import credentials from '../../../../credentials/credentialsFeedback.json';


const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});
const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID =
  process.env.GS_FEEDBACK_DEFAULT_ID ||
  '1jvHLbdwFigsY7IYtthOTol6QikYuw0aqp2x5wC3TlQ8';

// ▶️ nome padrão da aba que vamos formatar/usar
const TABLE_SHEET_TITLE = 'Feedbacks';

/* ----------------------------- Schema (sem meta) ----------------------------- */
const FeedbackSchema = z.object({
  category: z.enum(['bug', 'melhoria', 'outros']),
  subject: z.string().min(3).max(120),
  message: z.string().min(10),
  user: z.object({
    id: z.string(),
    name: z.string().nullish().optional(),
    email: z.string().email().nullish().optional(),
  }),
});

export async function GET() {
  return NextResponse.json({ ok: true, sheet: SPREADSHEET_ID });
}

/* ------------------------- helpers de formatação ------------------------- */

type EnsureSheetResult = {
  sheetId: number;
  title: string;
  hasBanding: boolean;
  hasFilter: boolean;
};

async function ensureSheet(
  spreadsheetId: string,
  desiredTitle = TABLE_SHEET_TITLE
): Promise<EnsureSheetResult> {
  // já traz informações úteis (bandedRanges/basicFilter)
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields:
      'sheets(properties(sheetId,title,gridProperties),bandedRanges,basicFilter)',
  });


  const all = meta.data.sheets ?? [];
  const found = all.find(
    (s) =>
      (s.properties?.title ?? '').trim().toLowerCase() ===
      desiredTitle.trim().toLowerCase()
  );

  if (found?.properties?.sheetId != null) {
    return {
      sheetId: found.properties.sheetId,
      title: found.properties.title!,
      hasBanding: (found.bandedRanges?.length ?? 0) > 0,
      hasFilter: !!found.basicFilter,
    };
  }

  // não existe? cria
  const add = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: desiredTitle } } }] },
  });

  const sheetId = add.data.replies?.[0]?.addSheet?.properties?.sheetId;
  if (sheetId == null) {
    throw new Error(
      `Falha ao criar a aba "${desiredTitle}": sheetId não retornado.`
    );
  }
  return { sheetId, title: desiredTitle, hasBanding: false, hasFilter: false };
}

async function applyPrettyTable(
  spreadsheetId: string,
  tabName = TABLE_SHEET_TITLE
): Promise<{ sheetId: number; title: string }> {
  const { sheetId, title, hasBanding, hasFilter } = await ensureSheet(
    spreadsheetId,
    tabName
  );

  // Cabeçalhos (A..G)
  const headers = [
    'Data/Hora',
    'Categoria',
    'Assunto',
    'Mensagem',
    'UserId',
    'UserName',
    'UserEmail',
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!A1:G1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [headers] },
  });

  // Lote de formatações (idempotente)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: any[] = [
    // Congelar 1ª linha
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    // Estilo de cabeçalho (verde + branco, centralizado, bold)
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 7, // A..G
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.25, green: 0.45, blue: 0.25 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
            horizontalAlignment: 'CENTER',
          },
        },
        fields:
          'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      },
    },
    // Altura do cabeçalho
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 36 },
        fields: 'pixelSize',
      },
    },
    // Larguras das colunas (7)
    ...[160, 120, 280, 520, 220, 180, 240].map((pixelSize, i) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize },
        fields: 'pixelSize',
      },
    })),
    // Formato data/hora em A
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'DATE_TIME', pattern: 'dd/MM/yyyy HH:mm' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    // Wrap em Mensagem (D = index 3)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, startColumnIndex: 3, endColumnIndex: 4 },
        cell: { userEnteredFormat: { wrapStrategy: 'WRAP' } },
        fields: 'userEnteredFormat.wrapStrategy',
      },
    },
    // Validação em Categoria (B = index 1)
    {
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: [
              { userEnteredValue: 'melhoria' },
              { userEnteredValue: 'bug' },
              { userEnteredValue: 'outros' },
            ],
          },
          inputMessage: 'Escolha: melhoria, bug ou outros',
          strict: true,
          showCustomUi: true,
        },
      },
    },
    // Cores por categoria (B)
    {
      addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: [
            { sheetId, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 },
          ],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'melhoria' }] },
            format: {
              backgroundColor: { red: 0.87, green: 0.97, blue: 0.9 },
              textFormat: { bold: true },
            },
          },
        },
      },
    },
    {
      addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: [
            { sheetId, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 },
          ],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'bug' }] },
            format: {
              backgroundColor: { red: 1, green: 0.9, blue: 0.9 },
              textFormat: { bold: true },
            },
          },
        },
      },
    },
    {
      addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: [
            { sheetId, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 },
          ],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'outros' }] },
            format: {
              backgroundColor: { red: 1, green: 0.98, blue: 0.86 },
              textFormat: { bold: true },
            },
          },
        },
      },
    },
  ];

  // ↪️ só adiciona banding se ainda não houver (A..G)
  if (!hasBanding) {
    requests.push({
      addBanding: {
        bandedRange: {
          range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 7 },
          rowProperties: {
            headerColor: { red: 0.85, green: 0.27, blue: 0.25 },
            firstBandColor: { red: 1, green: 1, blue: 1 },
            secondBandColor: { red: 0.98, green: 0.97, blue: 0.97 },
          },
        },
      },
    });
  }

  // ↪️ só adiciona filtro se ainda não houver (A..G)
  if (!hasFilter) {
    requests.push({
      setBasicFilter: {
        filter: {
          range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 7 },
        },
      },
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  return { sheetId, title };
}

/* --------------------------------- POST --------------------------------- */

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();

    const parsed = FeedbackSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Payload inválido', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { category, subject, message, user } = parsed.data;

    const date = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });

    const row = [
      date,             // A: Data/Hora
      category,         // B: Categoria
      subject,          // C: Assunto
      message,          // D: Mensagem
      user.id,          // E: UserId
      user.name ?? '',  // F: UserName
      user.email ?? '', // G: UserEmail
    ];

    // 1) garante a aba e aplica o estilo (idempotente)
    const { title } = await applyPrettyTable(SPREADSHEET_ID, TABLE_SHEET_TITLE);

    // 2) append na aba já formatada
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${title}!A:G`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    return NextResponse.json(
      { message: 'Feedback registrado com sucesso!', result: res.data },
      { status: 200 }
    );
  }  catch (error) {
    console.error('[feedback][POST] erro detalhado:', error);
    return NextResponse.json(
      { message: 'Erro ao salvar feedback.', details: String(error) },
      { status: 500 }
    );
  }
}
