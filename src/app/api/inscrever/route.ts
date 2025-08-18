import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

// Caminho para sua chave JSON (vamos já corrigir isso depois)
import credentials from '../../../../credentials/credentials.json';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

// Substitua com o ID da sua planilha
const SPREADSHEET_ID = '1qVfxFv0OJtBBqSLkjwSuhdNP38TmdGiaEa-5Zm9fYkI';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone } = await req.json();

    const date = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[name, email, phone, date]],
      },
    });

    return NextResponse.json({ message: 'Inscrição realizada com sucesso!' }, {status: 200});
  } catch (error) {
    console.error('Erro ao inscrever:', error);
    return NextResponse.json({ message: 'Erro ao inscrever.' }, { status: 500 });
  }
}
