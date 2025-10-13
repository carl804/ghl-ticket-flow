import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the credentials from the environment variable
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);

    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Read from Agent Performance sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Agent Performance!A:O',
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return res.status(200).json({ data: [] });
    }

    // First row is headers
    const headers = rows[0];
    
    // Convert rows to objects
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    // Get the most recent entry for each agent
    const latestByAgent = {};
    data.forEach(entry => {
      const agent = entry['Agent Name'];
      const timestamp = new Date(entry['Timestamp']);
      
      if (!latestByAgent[agent] || new Date(latestByAgent[agent]['Timestamp']) < timestamp) {
        latestByAgent[agent] = entry;
      }
    });

    const latestData = Object.values(latestByAgent);

    return res.status(200).json({ 
      success: true,
      data: latestData,
      allData: data
    });

  } catch (error) {
    console.error('Error fetching agent performance:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch agent performance data',
      details: error.message 
    });
  }
}