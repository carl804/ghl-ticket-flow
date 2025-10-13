import { google } from 'googleapis';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

const STAGE_MAP = {
  "3f3482b8-14c4-4de2-8a3c-4a336d01bb6e": "Open",
  "bef596b8-d63d-40bd-b59a-5e0e474f1c8f": "In Progress",
  "4e24e27c-2e44-435b-bc1b-964e93518f20": "Resolved",
  "fdbed144-2dd3-48b7-981d-b0869082cc4e": "Closed",
  "7558330f-4b0e-48fd-af40-ab57f38c4141": "Escalated to Dev",
  "4a6eb7bf-51b0-4f4e-ad07-40256b92fe5b": "Deleted",
};

const CUSTOM_FIELD_IDS = {
  ticketOwner: 'VYv1QpVAAgns13227Pii',
};

function getCustomFieldValue(opp, fieldId) {
  const customFields = opp.customFields || [];
  const field = customFields.find(f => f.id === fieldId);
  return field?.fieldValue || field?.value || field?.field_value || '';
}

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
    const locationId = process.env.VITE_GHL_LOCATION_ID || process.env.GHL_LOCATION_ID;
    
    const searchUrl = `${GHL_API_BASE}/opportunities/search?location_id=${locationId}&pipeline_id=p14Is7nXjiqS6MVI0cCk&limit=100`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: '2021-07-28',
        Accept: 'application/json',
      },
    });

    const searchData = await searchResponse.json();
    const opportunityIds = (searchData.opportunities || []).map(opp => opp.id);
    
    console.log(`Found ${opportunityIds.length} opportunities`);
    
    const fullOpportunities = await Promise.all(
      opportunityIds.map(async id => {
        const oppUrl = `${GHL_API_BASE}/opportunities/${id}`;
        const oppResponse = await fetch(oppUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-07-28',
            Accept: 'application/json',
          },
        });
        const oppData = await oppResponse.json();
        return oppData.opportunity;
      })
    );

    console.log(`Fetched details for ${fullOpportunities.length} opportunities`);

    // Read Stage Transitions to calculate time in current stage
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const transitionsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Stage Transitions!A:L',
    });

    const transitionsRows = transitionsResponse.data.values || [];
    console.log(`Read ${transitionsRows.length} stage transition rows`);

    // Calculate time in current stage for each ticket
    const ticketTimeInStage = new Map();
    const now = Date.now();

    fullOpportunities.forEach(opp => {
      const ticketId = opp.id;
      const currentStage = STAGE_MAP[opp.pipelineStageId] || 'Open';
      
      // Find most recent transition TO current stage
      const relevantTransitions = transitionsRows
        .slice(1)
        .filter(row => row[1] === ticketId && row[8] === currentStage)
        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
      
      if (relevantTransitions.length > 0) {
        const lastTransition = relevantTransitions[0];
        const transitionTime = new Date(lastTransition[0]).getTime();
        const hoursInStage = (now - transitionTime) / (1000 * 60 * 60);
        ticketTimeInStage.set(ticketId, hoursInStage);
      }
    });

    const agentMap = new Map();
    
    fullOpportunities.forEach(opp => {
      const agent = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.ticketOwner) || 'Unassigned';
      const stage = STAGE_MAP[opp.pipelineStageId] || 'Open';
      
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
          escalations: 0,
          stageTimeList: []
        });
      }
      
      const metrics = agentMap.get(agent);
      metrics.total++;
      
      // Add time in stage for active tickets only
      if (stage !== 'Closed' && ticketTimeInStage.has(opp.id)) {
        metrics.stageTimeList.push(ticketTimeInStage.get(opp.id));
      }
      
      if (stage === 'Open') metrics.open++;
      if (stage === 'In Progress') metrics.inProgress++;
      if (stage === 'Escalated to Dev') {
        metrics.escalated++;
        metrics.escalations++;
      }
      if (stage === 'Resolved') metrics.resolved++;
      if (stage === 'Closed') {
        metrics.closed++;
        const created = new Date(opp.createdAt);
        const closed = new Date(opp.updatedAt);
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
      
      const avgTimeInStage = metrics.stageTimeList.length > 0
        ? Math.round(metrics.stageTimeList.reduce((a, b) => a + b, 0) / metrics.stageTimeList.length)
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
        avgTimeInStage + 'h',
        escalationPercent + '%',
        activeTickets
      ]);
    });

    console.log('Rows to write:', rows.length);

    if (rows.length > 0) {
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
      ticketsFetched: fullOpportunities.length
    });
  } catch (error) {
    console.error('Error logging agent performance:', error);
    return res.status(500).json({ 
      error: 'Failed to log agent performance',
      details: error.message 
    });
  }
}
