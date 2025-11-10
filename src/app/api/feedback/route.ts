// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** ================= GCP CREDS VIA ENVs (sem arquivo) ================= **/

// 1) Tente carregar de uma env única (JSON)
function fromJsonEnv() {
  const raw = process.env.GCP_SA_KEY_JSON;
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    // normaliza quebra de linha do PEM se necessário
    if (obj.private_key && typeof obj.private_key === 'string') {
      obj.private_key = obj.private_key.replace(/\\n/g, '\n');
    }
    return obj;
  } catch {
    throw new Error('GCP_SA_KEY_JSON inválido: não é um JSON válido.');
  }
}

// 2) Ou de envs individuais
function fromSplitEnvs() {
  const required = [
    'GCP_TYPE',
    'GCP_PROJECT_ID',
    'GCP_PRIVATE_KEY',
    'GCP_CLIENT_EMAIL',
    'GCP_CLIENT_ID',
    'GCP_AUTH_URI',
    'GCP_TOKEN_URI',
    'GCP_AUTH_PROVIDER_X509_CERT_URL',
  ] as const;

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) return null;

  return {
    type: process.env.GCP_TYPE,
    project_id: process.env.GCP_PROJECT_ID,
    private_key_id: process.env.GCP_PRIVATE_KEY_ID ?? '',
    private_key: process.env.GCP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    client_email: process.env.GCP_CLIENT_EMAIL,
    client_id: process.env.GCP_CLIENT_ID,
    auth_uri: process.env.GCP_AUTH_URI,
    token_uri: process.env.GCP_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GCP_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.GCP_CLIENT_X509_CERT_URL ?? '',
    universe_domain: process.env.GCP_UNIVERSE_DOMAIN ?? 'googleapis.com',
  };
}

function loadGcpCredentials() {
  return fromJsonEnv() ?? fromSplitEnvs();
}

const credentials = loadGcpCredentials();
if (!credentials) {
  // Falha rápida e clara em dev/preview; em prod isso vira 500 no POST
  console.warn('[feedback] Credenciais GCP não configuradas nas variáveis de ambiente.');
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
  credentials: credentials ?? undefined, // undefined deixa a lib tentar ADC, se existir
  scopes: SCOPES,
});
const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID =
  process.env.GS_FEEDBACK_DEFAULT_ID ||
  '1jvHLbdwFigsY7IYtthOTol6QikYuw0aqp2x5wC3TlQ8';

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: any[] = [
    { updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
    }},
    { repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 7 },
        cell: { userEnteredFormat: {
          backgroundColor: { red: 0.25, green: 0.45, blue: 0.25 },
          textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
          horizontalAlignment: 'CENTER',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
    }},
    { updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 36 },
        fields: 'pixelSize',
    }},
    ...[160, 120, 280, 520, 220, 180, 240].map((pixelSize, i) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize },
        fields: 'pixelSize',
      },
    })),
    { repeatCell: {
        range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'DATE_TIME', pattern: 'dd/MM/yyyy HH:mm' } } },
        fields: 'userEnteredFormat.numberFormat',
    }},
    { repeatCell: {
        range: { sheetId, startRowIndex: 1, startColumnIndex: 3, endColumnIndex: 4 },
        cell: { userEnteredFormat: { wrapStrategy: 'WRAP' } },
        fields: 'userEnteredFormat.wrapStrategy',
    }},
    { setDataValidation: {
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
    }},
    { addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 }],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'melhoria' }] },
            format: { backgroundColor: { red: 0.87, green: 0.97, blue: 0.9 }, textFormat: { bold: true } },
          },
        },
    }},
    { addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 }],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'bug' }] },
            format: { backgroundColor: { red: 1, green: 0.9, blue: 0.9 }, textFormat: { bold: true } },
          },
        },
    }},
    { addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 }],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'outros' }] },
            format: { backgroundColor: { red: 1, green: 0.98, blue: 0.86 }, textFormat: { bold: true } },
          },
        },
    }},
  ];

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
    if (!credentials) {
      return NextResponse.json(
        { message: 'Credenciais GCP não configuradas.' },
        { status: 500 }
      );
    }

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
      date,
      category,
      subject,
      message,
      user.id,
      user.name ?? '',
      user.email ?? '',
    ];

    const { title } = await applyPrettyTable(SPREADSHEET_ID, TABLE_SHEET_TITLE);

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
  } catch (error) {
    console.error('[feedback][POST] erro detalhado:', error);
    return NextResponse.json(
      { message: 'Erro ao salvar feedback.', details: String(error) },
      { status: 500 }
    );
  }
}
