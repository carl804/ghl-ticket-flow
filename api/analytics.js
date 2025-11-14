import { google } from 'googleapis';
import OpenAI from 'openai';

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
const AI_SUMMARY_FIELD_ID = 'vyVjRNq3dgT7MY5vlcFT';
const ROOT_CAUSE_CACHE_ID = 'qP11dpPLZKwvjL4FYeBk';

// Cache thresholds for root cause analysis
const CACHE_THRESHOLDS = {
  '7': 20,   // Re-analyze after 20 new tickets for 7-day view
  '30': 50   // Re-analyze after 50 new tickets for 30-day view
};

// Cache for rate limiting overview
let cachedOverviewData = null;
let lastOverviewFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

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

  if (type === 'root-cause') {
    return await handleRootCauseAnalysis(req, res);
  }

  if (!type || !['agent-performance', 'daily-metrics', 'root-cause'].includes(type)) {
    return res.status(400).json({ 
      error: 'Invalid type parameter',
      details: 'Use ?type=agent-performance, ?type=daily-metrics, ?type=root-cause, or ?type=overview'
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

// Handle live overview from GHL API - SINGLE API CALL ONLY
async function handleLiveOverview(req, res) {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedOverviewData && (now - lastOverviewFetch) < CACHE_DURATION) {
      console.log('Serving cached overview data');
      return res.status(200).json({
        ...cachedOverviewData,
        cached: true,
        cacheAge: Math.round((now - lastOverviewFetch) / 1000)
      });
    }

    console.log('Fetching fresh overview data...');

    const accessToken = process.env.GHL_ACCESS_TOKEN_TEMP || process.env.GHL_ACCESS_TOKEN || req.headers.authorization?.replace('Bearer ', '');
    const locationId = process.env.GHL_LOCATION_ID;

    if (!accessToken || !locationId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'GHL access token or location ID not found'
      });
    }

    const pipelineId = 'p14Is7nXjiqS6MVI0cCk';

    // SINGLE API CALL - Get all opportunities with their custom fields
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
      if (response.status === 429) {
        // Rate limited - return cached data if available
        if (cachedOverviewData) {
          console.log('Rate limited, serving stale cache');
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

    // NO MORE INDIVIDUAL API CALLS - Use data from search endpoint directly
    console.log(`Using ${opportunities.length} opportunities from search endpoint`);

    function getCustomFieldValue(opp, fieldId) {
      const customFields = opp.customFields || [];
      const field = customFields.find(f => f.id === fieldId);
      return field?.fieldValueString || field?.fieldValue || field?.value || field?.field_value || '';
    }

    const tickets = opportunities.map(opp => ({
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
      console.log('Error occurred, serving cached data');
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

// Handle root cause analysis with intelligent caching
async function handleRootCauseAnalysis(req, res) {
  try {
    const { days = '30', force = 'false' } = req.query;
    const daysNumber = parseInt(days);
    const forceRefresh = force === 'true';
    
    console.log(`Root cause analysis requested for ${daysNumber} days (force: ${forceRefresh})`);

    const accessToken = process.env.GHL_ACCESS_TOKEN_TEMP || process.env.GHL_ACCESS_TOKEN || req.headers.authorization?.replace('Bearer ', '');
    const locationId = process.env.GHL_LOCATION_ID;

    if (!accessToken || !locationId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'GHL access token or location ID not found'
      });
    }

    const pipelineId = 'p14Is7nXjiqS6MVI0cCk';

    // 1. Fetch current tickets
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
      throw new Error(`GHL API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const opportunities = data.opportunities || [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNumber);

    const recentTickets = opportunities.filter(opp => {
      const createdAt = new Date(opp.createdAt);
      return createdAt >= cutoffDate;
    });

    function getCustomFieldValue(opp, fieldId) {
      const customFields = opp.customFields || [];
      const field = customFields.find(f => f.id === fieldId);
      return field?.fieldValueString || field?.fieldValue || field?.value || field?.field_value || '';
    }

    const summaries = recentTickets
      .map(opp => {
        const summary = getCustomFieldValue(opp, AI_SUMMARY_FIELD_ID);
        return {
          ticketId: opp.id,
          ticketName: opp.name,
          summary: summary,
          status: STAGE_MAP[opp.pipelineStageId] || "Open",
          createdAt: opp.createdAt
        };
      })
      .filter(item => item.summary && item.summary.trim().length > 0);

    console.log(`Found ${summaries.length} tickets with AI summaries out of ${recentTickets.length} total`);

    if (summaries.length === 0) {
      return res.status(200).json({
        success: true,
        days: daysNumber,
        totalTickets: recentTickets.length,
        analyzedTickets: 0,
        message: 'No tickets with AI summaries found',
        categories: [],
        cached: false
      });
    }

    // 2. Get cached data from GHL custom value
    const cacheData = await getCustomValueCache(locationId, ROOT_CAUSE_CACHE_ID, accessToken);
    const cachedAnalysis = cacheData?.[days];

    // 3. Check if we should use cache
    if (!forceRefresh && cachedAnalysis) {
      const ticketDiff = summaries.length - cachedAnalysis.ticketCount;
      const threshold = CACHE_THRESHOLDS[days];
      
      console.log(`Cache check: ${ticketDiff} new tickets since cache (threshold: ${threshold})`);
      
      if (ticketDiff < threshold) {
        const cacheAge = Math.round((Date.now() - new Date(cachedAnalysis.analyzedAt).getTime()) / 1000 / 60); // minutes
        console.log(`✅ Using cached analysis (${cacheAge} minutes old)`);
        
        return res.status(200).json({
          ...cachedAnalysis.results,
          cached: true,
          cacheAge: `${cacheAge} minutes`,
          newTicketsSinceCache: ticketDiff,
          nextAnalysisAt: `${threshold - ticketDiff} more tickets`
        });
      } else {
        console.log(`🔄 Threshold exceeded, running fresh analysis`);
      }
    }

    // 4. Run AI analysis (cache miss or threshold exceeded)
    console.log('Running OpenAI analysis...');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const summaryText = summaries.map((s, i) => 
      `${i + 1}. ${s.ticketName}: ${s.summary}`
    ).join('\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `You are an expert support analyst. Analyze these ticket summaries and categorize them into pain points.

Categories to use:
- Product Bugs: Software errors, features not working correctly, technical failures
- User Education: How-to questions, confusion about features, need training/documentation
- Feature Requests: Customers want new functionality that doesn't exist
- Billing Issues: Payment problems, subscription questions, pricing confusion
- Integration Problems: Issues connecting with other tools/services
- Configuration Help: Setup assistance, settings questions, account configuration
- Performance Issues: Slow loading, timeouts, system performance problems
- Data Issues: Import/export problems, data sync issues, missing data
- Other: Anything that doesn't fit above categories

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "categories": [
    {
      "name": "Product Bugs",
      "count": 15,
      "percentage": 35,
      "topIssues": [
        {"issue": "Export feature failing", "count": 5},
        {"issue": "Dashboard not loading", "count": 4}
      ]
    }
  ],
  "insights": [
    "Most common issue is...",
    "Consider improving..."
  ]
}`
      }, {
        role: "user",
        content: `Analyze these ${summaries.length} ticket summaries:\n\n${summaryText}`
      }],
      temperature: 0.3,
      max_tokens: 1500
    });

    const result = completion.choices[0].message.content;
    const cleanedResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleanedResult);

    // Add metadata
    const results = {
      success: true,
      days: daysNumber,
      totalTickets: recentTickets.length,
      analyzedTickets: summaries.length,
      categories: analysis.categories || [],
      insights: analysis.insights || [],
      analyzedAt: new Date().toISOString()
    };

    // 5. Save to cache
    await saveCustomValueCache(
      locationId, 
      ROOT_CAUSE_CACHE_ID, 
      accessToken,
      days,
      {
        results,
        ticketCount: summaries.length,
        analyzedAt: new Date().toISOString()
      },
      cacheData // Pass existing cache to preserve other day ranges
    );

    console.log(`✅ Analysis complete and cached`);

    return res.status(200).json({
      ...results,
      cached: false
    });

  } catch (error) {
    console.error('Error in root cause analysis:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze root causes',
      details: error.message 
    });
  }
}

// Helper: Get cache from GHL custom value
async function getCustomValueCache(locationId, customValueId, accessToken) {
  try {
    console.log(`📥 Fetching cache from custom value ${customValueId}...`);
    
    const response = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/customValues/${customValueId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28'
        }
      }
    );

    console.log(`Cache GET response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Cache GET error:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('Raw cache response:', JSON.stringify(data, null, 2));
    
    const value = data.customValue?.value || data.value;
    
    if (!value || value.trim() === '') {
      console.log('📭 Cache is empty');
      return null;
    }

    const parsed = JSON.parse(value);
    console.log('✅ Cache retrieved successfully. Keys:', Object.keys(parsed));
    return parsed;
  } catch (error) {
    console.error('❌ Error reading cache:', error);
    return null;
  }
}

// Helper: Save cache to GHL custom value
async function saveCustomValueCache(locationId, customValueId, accessToken, daysKey, analysisData, existingCache) {
  try {
    // Merge with existing cache to preserve other day ranges
    const cacheValue = existingCache || {};
    cacheValue[daysKey] = analysisData;

    const payload = {
      name: "Root Cause Analysis",  // ← ADD THIS LINE
      value: JSON.stringify(cacheValue)
    };

    console.log(`💾 Saving cache for ${daysKey} days...`);
    console.log('Payload size:', JSON.stringify(payload).length, 'characters');

    const response = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/customValues/${customValueId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    console.log(`Cache PUT response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Cache PUT error:', errorText);
      throw new Error(`Failed to save cache: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Cache save result:', JSON.stringify(result, null, 2));
    console.log(`✅ Cache saved for ${daysKey} days`);
    return true;
  } catch (error) {
    console.error('❌ Error saving cache:', error);
    // Don't fail the request if cache save fails
    return false;
  }
}

// Handle metrics cron job (writes daily snapshot to Google Sheets)
async function handleMetricsCron(req, res) {
  try {
    console.log('Metrics cron started...');
    
    const tickets = await fetchTicketsFromGHL();
    console.log(`Fetched ${tickets.length} tickets`);
    
    const metrics = calculateMetrics(tickets);
    console.log('Calculated metrics:', metrics);
    
    await writeToGoogleSheets(metrics);
    
    res.status(200).json({ 
      success: true, 
      metrics,
      message: 'Metrics updated successfully' 
    });
  } catch (error) {
    console.error('Metrics cron error:', error);
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
  
  console.log('Metrics written to Google Sheets:', metrics);
}