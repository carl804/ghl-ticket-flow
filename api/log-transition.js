import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      ticketId,
      ticketName,
      agent,
      contactName,
      category,
      priority,
      fromStage,
      toStage,
      durationInPreviousStage,
      totalTicketAge
    } = req.body;

    console.log('Logging stage transition:', { ticketId, fromStage, toStage });

    // Parse Google Sheets credentials from environment
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare the row data
    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      ticketId,
      ticketName,
      agent,
      contactName,
      category,
      priority,
      fromStage,
      toStage,
      durationInPreviousStage,
      totalTicketAge
    ];

    // Append to Sheet 2 (Stage Transitions)
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Stage Transitions!A:K', // Sheet name: "Stage Transitions"
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    console.log('Successfully logged to Google Sheets');
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error logging to Google Sheets:', error);
    return res.status(500).json({ 
      error: 'Failed to log to Google Sheets',
      message: error.message 
    });
  }
}