import { google } from 'googleapis';

// Stage mapping
const STAGE_MAP = {
  "3f3482b8-14c4-4de2-8a3c-4a336d01bb6e": "Open",
  "bef596b8-d63d-40bd-b59a-5e0e474f1c8f": "In Progress",
  "4e24e27c-2e44-435b-bc1b-964e93518f20": "Resolved",
  "fdbed144-2dd3-48b7-981d-b0869082cc4e": "Closed",
  "7558330f-4b0e-48fd-af40-ab57f38c4141": "Escalated to Dev",
  "4a6eb7bf-51b0-4f4e-ad07-40256b92fe5b": "Deleted",
};

const TICKET_OWNER_FIELD_ID = 'VYv1QpVAAgns13227Pii';

// Cache for rate limiting
let cachedOverviewData = null;
let lastOverviewFetch = 0;
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes cache

export default async function handler(req, res) {
  const { type, action } = req.query;

  // Route based on type or action
  if (action === 'cron') {
    return await handleMetricsCron(req, res);
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (type === 'overview' || type === 'live') {
    return await handleLiveOverview(req, res);
  }

  if (!type || !['agent-performance', 'daily-metrics'].includes(type)) {
    return res.status(400).json({ 
      error: 'Invalid type parameter',
      details: 'Use ?type=agent-performance, ?type=daily-metrics, or ?type=overview'
    });
  }

  try {
    const { sheets, spreadsheetId } = await initializeGoogleSheets();

    if (type === 'agent-performance') {
      return await handleAgentPerformance(sheets, spreadsheetId, res);
    } else if (type === 'daily-metrics') {
      return await handleDailyMetrics(sheets, spreadsheetId, res);
    }

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch analytics data',
      details: error.message 
    });
  }
}

// Initialize Google Sheets API
async function initializeGoogleSheets() {
  let credentials;
  try {
    credentials = typeof process.env.GOOGLE_SHEETS_CREDENTIALS === 'string' 
      ? JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS)
      : process.env.GOOGLE_SHEETS_CREDENTIALS;
  } catch (e) {
    throw new Error('Invalid Google credentials configuration');
  }

  if (!credentials || !credentials.client_email || !credentials.private_key) {
    throw new Error('Missing required credentials');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  return { sheets, spreadsheetId };
}

// Handle agent performance data from Google Sheets
async function handleAgentPerformance(sheets, spreadsheetId, res) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Agent Performance!A:O',
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

    const latestByAgent = {};
    data.forEach(entry => {
      const agent = entry['Agent Name'] || entry['Agent'];
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

// Handle daily metrics data from Google Sheets
async function handleDailyMetrics(sheets, spreadsheetId, res) {
  try {
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

// Handle live overview from GHL API - WITH CACHING TO PREVENT RATE LIMITS
async function handleLiveOverview(req, res) {
  try {
    // Check cache first to prevent rate limiting
    const now = Date.now();
    if (cachedOverviewData && (now - lastOverviewFetch) < CACHE_DURATION) {
      console.log('📋 Serving cached overview data');
      return res.status(200).json({
        ...cachedOverviewData,
        cached: true,
        cacheAge: Math.round((now - lastOverviewFetch) / 1000)
      });
    }

    console.log('🔄 Fetching fresh overview data...');

    const accessToken = process.env.GHL_ACCESS_TOKEN_TEMP || process.env.GHL_ACCESS_TOKEN || req.headers.authorization?.replace('Bearer ', '');
    const locationId = process.env.GHL_LOCATION_ID;

    if (!accessToken || !locationId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'GHL access token or location ID not found'
      });
    }

    const pipelineId = 'p14Is7nXjiqS6MVI0cCk';

    // Reduce limit to avoid rate limits
    const response = await fetch(
      `https://services.leadconnectorhq.com/opportunities/search?location_id=${locationId}&pipeline_id=${pipelineId}&limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - return cached data if available
        if (cachedOverviewData) {
          console.log('⚠️ Rate limited, serving stale cache');
          return res.status(200).json({
            ...cachedOverviewData,
            cached: true,
            rateLimited: true
          });
        }
        throw new Error('Rate limited and no cached data available');
      }
      throw new Error(`GHL API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const opportunities = data.opportunities || [];

    // Process in smaller batches to avoid overwhelming the API
    const batchSize = 10;
    const fullOpportunities = [];
    
    for (let i = 0; i < opportunities.length; i += batchSize) {
      const batch = opportunities.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (opp) => {
        try {
          // Add small delay between requests
          if (i > 0) await new Promise(resolve => setTimeout(resolve, 100));
          
          const oppResponse = await fetch(
            `https://services.leadconnectorhq.com/opportunities/${opp.id}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (!oppResponse.ok) {
            if (oppResponse.status === 429) {
              console.error(`Rate limited on opportunity ${opp.id}`);
              return null;
            }
            console.error(`Failed to fetch opportunity ${opp.id}: ${oppResponse.statusText}`);
            return null;
          }
          
          const oppData = await oppResponse.json();
          return oppData.opportunity;
        } catch (err) {
          console.error(`Error fetching opportunity ${opp.id}:`, err);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      fullOpportunities.push(...batchResults.filter(opp => opp !== null));
      
      // Small delay between batches
      if (i + batchSize < opportunities.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`📊 Fetched ${fullOpportunities.length} of ${opportunities.length} opportunities`);

    function getCustomFieldValue(opp, fieldId) {
      const customFields = opp.customFields || [];
      const field = customFields.find(f => f.id === fieldId);
      return field?.fieldValue || field?.value || field?.field_value || '';
    }

    const tickets = fullOpportunities.map(opp => ({
      id: opp.id,
      status: STAGE_MAP[opp.pipelineStageId] || "Open",
      assignedTo: getCustomFieldValue(opp, TICKET_OWNER_FIELD_ID) || "Unassigned",
      createdAt: new Date(opp.createdAt),
      updatedAt: new Date(opp.updatedAt),
    }));

    const agentMap = new Map();
    
    tickets.forEach(ticket => {
      const agent = ticket.assignedTo;
      
      if (!agentMap.has(agent)) {
        agentMap.set(agent, {
          agent,
          total: 0,
          open: 0,
          inProgress: 0,
          escalated: 0,
          resolved: 0,
          closed: 0,
          closeRate: 0,
          avgCloseTime: '0m',
          active: 0,
        });
      }

      const metrics = agentMap.get(agent);
      metrics.total++;

      switch (ticket.status) {
        case 'Open':
          metrics.open++;
          metrics.active++;
          break;
        case 'In Progress':
          metrics.inProgress++;
          metrics.active++;
          break;
        case 'Escalated to Dev':
          metrics.escalated++;
          metrics.active++;
          break;
        case 'Resolved':
          metrics.resolved++;
          break;
        case 'Closed':
          metrics.closed++;
          break;
      }
    });

    const agentMetrics = Array.from(agentMap.values()).map(metrics => {
      const closeRate = metrics.total > 0 
        ? ((metrics.closed / metrics.total) * 100).toFixed(0)
        : 0;

      const closedTickets = tickets.filter(
        t => t.assignedTo === metrics.agent && t.status === 'Closed'
      );
      
      if (closedTickets.length > 0) {
        const avgMs = closedTickets.reduce(
          (sum, t) => sum + (t.updatedAt - t.createdAt), 
          0
        ) / closedTickets.length;
        
        const avgHours = Math.round(avgMs / (1000 * 60 * 60));
        const avgDays = Math.floor(avgHours / 24);
        const remainingHours = avgHours % 24;
        const avgMinutes = Math.round((avgMs / (1000 * 60)) % 60);
        
        if (avgDays > 0) {
          metrics.avgCloseTime = `${avgDays}d ${remainingHours}h ${avgMinutes}m`;
        } else if (avgHours > 0) {
          metrics.avgCloseTime = `${avgHours}h ${avgMinutes}m`;
        } else {
          metrics.avgCloseTime = `${avgMinutes}m`;
        }
      }

      return {
        ...metrics,
        closeRate: parseFloat(closeRate),
      };
    });

    const totalTickets = tickets.length;
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
      cached: false,
      fetchedAt: new Date().toISOString()
    };

    // Cache the result
    cachedOverviewData = analyticsData;
    lastOverviewFetch = now;

    return res.status(200).json(analyticsData);

  } catch (error) {
    console.error('Error fetching live analytics:', error);
    
    // If error and we have cached data, return it
    if (cachedOverviewData) {
      console.log('⚠️ Error occurred, serving cached data');
      return res.status(200).json({
        ...cachedOverviewData,
        cached: true,
        error: 'Fresh data unavailable, serving cache'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to fetch analytics',
      details: error.message 
    });
  }
}

// Handle metrics cron job (writes daily snapshot to Google Sheets)
async function handleMetricsCron(req, res) {
  try {
    console.log('🕐 Metrics cron started...');
    
    const tickets = await fetchTicketsFromGHL();
    console.log(`📊 Fetched ${tickets.length} tickets`);
    
    const metrics = calculateMetrics(tickets);
    console.log('📈 Calculated metrics:', metrics);
    
    await writeToGoogleSheets(metrics);
    
    res.status(200).json({ 
      success: true, 
      metrics,
      message: 'Metrics updated successfully' 
    });
  } catch (error) {
    console.error('❌ Metrics cron error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

async function fetchTicketsFromGHL() {
  const locationId = process.env.GHL_LOCATION_ID;
  const accessToken = process.env.GHL_ACCESS_TOKEN_TEMP || process.env.GHL_ACCESS_TOKEN;
  
  if (!locationId || !accessToken) {
    throw new Error('GHL credentials not configured');
  }

  const pipelineId = 'p14Is7nXjiqS6MVI0cCk';
  
  const response = await fetch(
    `https://services.leadconnectorhq.com/opportunities/search?location_id=${locationId}&pipeline_id=${pipelineId}&limit=100`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`GHL API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.opportunities || [];
}

function calculateMetrics(tickets) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const ticketsWithStatus = tickets.map(t => ({
    ...t,
    status: STAGE_MAP[t.pipelineStageId] || "Open",
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt)
  }));
  
  const total = ticketsWithStatus.length;
  const newToday = ticketsWithStatus.filter(t => t.createdAt >= todayStart).length;
  const closedToday = ticketsWithStatus.filter(t => 
    t.status === "Closed" && t.updatedAt >= todayStart
  ).length;
  const resolvedToday = ticketsWithStatus.filter(t => 
    t.status === "Resolved" && t.updatedAt >= todayStart
  ).length;
  const escalatedToday = ticketsWithStatus.filter(t => 
    t.status === "Escalated to Dev" && t.updatedAt >= todayStart
  ).length;
  
  const resolved = ticketsWithStatus.filter(t => t.status === "Resolved");
  const avgMs = resolved.length > 0
    ? resolved.reduce((acc, t) => acc + (t.updatedAt - t.createdAt), 0) / resolved.length
    : 0;
  const avgHours = Math.round(avgMs / (1000 * 60 * 60));
  const avgResolutionTime = avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d ${avgHours % 24}h`;
  
  const openEOD = ticketsWithStatus.filter(t => t.status === "Open").length;
  const inProgressEOD = ticketsWithStatus.filter(t => t.status === "In Progress").length;
  const escalatedEOD = ticketsWithStatus.filter(t => t.status === "Escalated to Dev").length;
  const totalActive = openEOD + inProgressEOD + escalatedEOD;
  
  return {
    date: now.toISOString(),
    total,
    newToday,
    closedToday,
    resolvedToday,
    escalatedToday,
    avgResolutionTime,
    openEOD,
    inProgressEOD,
    escalatedEOD,
    totalActive
  };
}

async function writeToGoogleSheets(metrics) {
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}');
  const sheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!credentials.client_email || !sheetId) {
    throw new Error('Google Sheets credentials not configured');
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  const row = [
    metrics.date,
    metrics.total,
    metrics.newToday,
    metrics.closedToday,
    metrics.resolvedToday,
    metrics.escalatedToday,
    metrics.avgResolutionTime,
    metrics.openEOD,
    metrics.inProgressEOD,
    metrics.escalatedEOD,
    metrics.totalActive
  ];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Daily Metrics!A:K',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row]
    }
  });
  
  console.log('✅ Metrics written to Google Sheets:', metrics);
}