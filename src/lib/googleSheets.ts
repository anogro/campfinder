import { google } from 'googleapis';
import { CampData } from '@/components/CampCard';

export async function getCampsData(): Promise<{ status: string; data?: CampData[]; message?: string }> {
  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKey || !sheetId) {
      return { status: 'error', message: 'Google Credentials are not properly configured.' };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Camps', // Assuming the sheet name is 'Camps'
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { status: 'success', data: [] };
    }

    const headers = rows[0];
    const data = rows.slice(1).map((row) => {
      const rowData: any = {};
      headers.forEach((header: string, index: number) => {
        rowData[header] = row[index] || '';
      });
      return rowData as CampData;
    });

    return { status: 'success', data };
  } catch (error: any) {
    console.error('Google Sheets API Error:', error);
    return { status: 'error', message: error.message };
  }
}
