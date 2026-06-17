import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKey || !sheetId) {
      return NextResponse.json({ status: 'error', message: 'Google Credentials not configured' }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Fetch logs from Crawl_Log sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Crawl_Log',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return NextResponse.json({ status: 'success', data: [] });
    }

    // Assuming headers are in row 0: Time, Query, Count, Status
    // We want the newest logs first, so we reverse the rows (excluding header)
    const logs = rows.slice(1).reverse().map(row => ({
      time: row[0] || '',
      query: row[1] || '',
      count: row[2] || '0',
      status: row[3] || '',
    }));

    // Return the latest 10 logs
    return NextResponse.json({ status: 'success', data: logs.slice(0, 10) });

  } catch (error: any) {
    console.error('Failed to fetch crawl logs:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
