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
    
    // Fetch logs from CrawlLogs sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'CrawlLogs',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return NextResponse.json({ status: 'success', data: [] });
    }

    // CrawlLogs headers: source_url, status, failure_reason, http_status, page_title, html_length, text_length, image_count, image_urls, screenshot_path, last_checked
    const logs = rows.slice(1).reverse().map(row => ({
      url: row[0] || '',
      status: row[1] || '',
      failure_reason: row[2] || '',
      title: row[4] || '',
      time: row[10] || '',
    }));

    // Return the latest 20 logs
    return NextResponse.json({ status: 'success', data: logs.slice(0, 20) });

  } catch (error: any) {
    console.error('Failed to fetch crawl logs:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
