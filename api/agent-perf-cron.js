import { google } from 'googleapis';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

async function getGHLAccessToken() {
  const tokenUrl = `${GHL_API_BASE}/oauth/token`;
  
  const params = new URLSearchParams({
    client_id: process.env.VITE_GHL_CLIENT_ID,
    client_secret: process.env.VITE_GHL_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: process.env.GHL_REFRESH_TOKEN,
    user_type: 'Location'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  const data = await response.json();
  console.log('Token response:', data);
  
  if (!response.ok || data.error) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting agent performance logging...');
    
    const accessToken = await getGHLAccessToken();
    console.log('Got access token:', accessToken ? 'YES' : 'NO');
    
    const locationId = process.env.VITE_GHL_LOCATION_ID || process.env.GHL_LOCATION_ID;
    console.log('Location ID:', locationId);
    
    const apiUrl = `${GHL_API_BASE}/opportunities/search?location_id=${locationId}&limit=100`;
    console.log('Calling:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: '2021-07-28',
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    console.log('API Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    console.log('Opportunities found:', data.opportunities?.length || 0);
    
    const tickets = data.opportunities || [];

    const agentMap = new Map();
    
    tickets.forEach(ticket => {
      const agent = ticket.assignedTo || 'Unassigned';
      if (!agentMap.has(agent)) {
        agentMap.set(agent, {
          agent,
          total: 0,
          open: 0,
          inProgress: 0,
          escalated: 0,
          resolved: 0,
          closed: 0,
          closeTimes: [],
          escalations: 0
        });
      }
      
      const metrics = agentMap.get(agent);
      metrics.total++;
      
      if (ticket.status === 'Open') metrics.open++;
      if (ticket.status === 'In Progress') metrics.inProgress++;
      if (ticket.status === 'Escalated to Dev') {
        metrics.escalated++;
        metrics.escalations++;
      }
      if (ticket.status === 'Resolved') metrics.resolved++;
      if (ticket.status === 'Closed') {
        metrics.closed++;
        const created = new Date(ticket.createdAt);
        const closed = new Date(ticket.updatedAt);
        const closeTimeHours = (closed - created) / (1000 * 60 * 60);
        metrics.closeTimes.push(closeTimeHours);
      }
    });

    console.log('Agents found:', agentMap.size);

    const timestamp = new Date().toISOString();
    const rows = [];
    
    agentMap.forEach(metrics => {
      const avgCloseTime = metrics.closeTimes.length > 0
        ? Math.round(metrics.closeTimes.reduce((a, b) => a + b, 0) / metrics.closeTimes.length)
        : 0;
      
      const closePercent = metrics.total > 0
        ? Math.round((metrics.closed / metrics.total) * 100)
        : 0;
      
      const escalationPercent = metrics.total > 0
        ? Math.round((metrics.escalations / metrics.total) * 100)
        : 0;
      
      const activeTickets = metrics.total - metrics.closed;
      
      rows.push([
        timestamp,
        metrics.agent,
        metrics.total,
        metrics.open,
        metrics.inProgress,
        metrics.escalated,
        metrics.resolved,
        metrics.closed,
        closePercent + '%',
        avgCloseTime + 'h',
        'N/A',
        escalationPercent + '%',
        activeTickets
      ]);
    });

    console.log('Rows to write:', rows.length);

    if (rows.length > 0) {
      const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}');
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Agent Performance!A:M',
        valueInputOption: 'USER_ENTERED',
        resource: { values: rows },
      });
      
      console.log('Successfully wrote to Google Sheets');
    }

    return res.status(200).json({ 
      success: true, 
      agentsLogged: rows.length,
      ticketsFetched: tickets.length
    });
  } catch (error) {
    console.error('Error logging agent performance:', error);
    return res.status(500).json({ 
      error: 'Failed to log agent performance',
      details: error.message 
    });
  }
}
