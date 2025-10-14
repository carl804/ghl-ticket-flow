import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let credentials;
    try {
      credentials = typeof process.env.GOOGLE_SHEETS_CREDENTIALS === 'string' 
        ? JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS)
        : process.env.GOOGLE_SHEETS_CREDENTIALS;
    } catch (e) {
      console.error('Failed to parse GOOGLE_SHEETS_CREDENTIALS:', e);
      return res.status(500).json({ 
        error: 'Invalid Google credentials configuration',
        details: 'Credentials could not be parsed'
      });
    }

    if (!credentials || !credentials.client_email || !credentials.private_key) {
      return res.status(500).json({ 
        error: 'Missing required credentials',
        details: 'client_email or private_key not found in credentials'
      });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Daily Metrics!A:K',
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const headers = rows[0];
    
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    const sortedData = data.sort((a, b) => {
      return new Date(b.Date) - new Date(a.Date);
    });

    return res.status(200).json({ 
      success: true,
      data: sortedData
    });

  } catch (error) {
    console.error('Error fetching daily metrics:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch daily metrics data',
      details: error.message 
    });
  }
}
