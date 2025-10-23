import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    // Initialize Google Sheets
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const timestamp = new Date().toISOString();

    // Route based on action type
    switch (action) {
      case 'log-transition':
        return await logTransition(req.body, sheets, spreadsheetId, timestamp, res);
      
      case 'log-ticket':
        return await logTicket(req.body, sheets, spreadsheetId, timestamp, res);
      
      default:
        // If no action specified, default to transition logging (backward compatibility)
        return await logTransition(req.body, sheets, spreadsheetId, timestamp, res);
    }

  } catch (error) {
    console.error('Error logging to Google Sheets:', error);
    return res.status(500).json({ 
      error: 'Failed to log to Google Sheets',
      details: error.message 
    });
  }
}

// Log stage transition
async function logTransition(body, sheets, spreadsheetId, timestamp, res) {
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
  } = body;

  console.log('Logging stage transition:', { ticketId, fromStage, toStage });

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

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Stage Transitions!A:K',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [row],
    },
  });

  console.log('Successfully logged transition to Google Sheets');
  return res.status(200).json({ success: true });
}

// Log ticket creation/update
async function logTicket(body, sheets, spreadsheetId, timestamp, res) {
  const {
    ticketId,
    ticketName,
    agent,
    contactName,
    category,
    priority,
    stage,
    source,
    notes
  } = body;

  console.log('Logging ticket:', { ticketId, stage });

  const row = [
    timestamp,
    ticketId,
    ticketName,
    agent,
    contactName,
    category,
    priority,
    stage,
    source,
    notes
  ];

  // Adjust the range and sheet name as needed for ticket logging
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Ticket Log!A:J', // Update sheet name if different
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [row],
    },
  });

  console.log('Successfully logged ticket to Google Sheets');
  return res.status(200).json({ success: true });
}