import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { ticketId, title, fromColumn, toColumn } = await request.json();

    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}');
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const timestamp = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:E',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[timestamp, ticketId, title, fromColumn, toColumn]],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging to Google Sheets:', error);
    return NextResponse.json(
      { error: 'Failed to log to Google Sheets', details: error.message },
      { status: 500 }
    );
  }
}
