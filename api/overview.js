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

    // Fetch Agent Performance data
    const agentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Agent Performance!A:M',
    });

    const agentRows = agentResponse.data.values;

    if (!agentRows || agentRows.length < 2) {
      return res.status(200).json({
        totalTickets: 0,
        totalAgents: 0,
        avgCloseRate: 0,
        avgEscalationRate: 0,
        agentMetrics: [],
      });
    }

    // Get most recent entries for each agent
    const agentDataMap = new Map();
    agentRows.slice(1).forEach(row => {
      const agent = row[1]; // Agent Name
      const timestamp = new Date(row[0]);
      
      if (!agentDataMap.has(agent) || new Date(agentDataMap.get(agent)[0]) < timestamp) {
        agentDataMap.set(agent, row);
      }
    });

    // Process agent metrics
    const agentMetrics = Array.from(agentDataMap.values()).map(row => {
      const closeRateStr = row[8] || '0%';
      const closeRate = parseFloat(closeRateStr.replace('%', '')) || 0;
      
      return {
        agent: row[1] || 'Unknown',
        total: parseInt(row[2]) || 0,
        open: parseInt(row[3]) || 0,
        inProgress: parseInt(row[4]) || 0,
        escalated: parseInt(row[5]) || 0,
        resolved: parseInt(row[6]) || 0,
        closed: parseInt(row[7]) || 0,
        closeRate: closeRate,
        avgCloseTime: row[9] || '0m',
        active: parseInt(row[12]) || 0,
      };
    });

    // Calculate totals
    const totalTickets = agentMetrics.reduce((sum, m) => sum + m.total, 0);
    const totalClosed = agentMetrics.reduce((sum, m) => sum + m.closed, 0);
    const totalEscalated = agentMetrics.reduce((sum, m) => sum + m.escalated, 0);
    const avgCloseRate = totalTickets > 0 ? (totalClosed / totalTickets) * 100 : 0;
    const avgEscalationRate = totalTickets > 0 ? (totalEscalated / totalTickets) * 100 : 0;

    const analyticsData = {
      totalTickets,
      totalAgents: agentMetrics.length,
      avgCloseRate,
      avgEscalationRate,
      agentMetrics,
    };

    return res.status(200).json(analyticsData);

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch analytics',
      details: error.message 
    });
  }
}