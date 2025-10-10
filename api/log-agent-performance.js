import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/ghl-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: '/opportunities/search',
        method: 'GET',
        queryParams: {
          location_id: process.env.GHL_LOCATION_ID,
          limit: 100
        }
      })
    });

    const data = await response.json();
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

    return res.status(200).json({ 
      success: true, 
      agentsLogged: rows.length 
    });
  } catch (error) {
    console.error('Error logging agent performance:', error);
    return res.status(500).json({ 
      error: 'Failed to log agent performance',
      details: error.message 
    });
  }
}
