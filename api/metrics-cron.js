import { google } from 'googleapis';

// Helper to parse GHL tokens from request (since this is a serverless function)
function getGHLTokens() {
  // In a cron job, we need tokens from environment or a secure store
  // For now, we'll fetch tickets directly using the location ID
  return {
    locationId: process.env.GHL_LOCATION_ID,
    accessToken: process.env.GHL_ACCESS_TOKEN
  };
}

// Fetch tickets using GHL API
async function fetchTicketsFromGHL() {
  const { locationId, accessToken } = getGHLTokens();
  
  if (!locationId || !accessToken) {
    throw new Error('GHL credentials not configured');
  }

  const pipelineId = 'p14Is7nXjiqS6MVI0cCk';
  
  // Fetch opportunities
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

// Stage mapping
const STAGE_MAP = {
  "3f3482b8-14c4-4de2-8a3c-4a336d01bb6e": "Open",
  "bef596b8-d63d-40bd-b59a-5e0e474f1c8f": "In Progress",
  "4e24e27c-2e44-435b-bc1b-964e93518f20": "Resolved",
  "fdbed144-2dd3-48b7-981d-b0869082cc4e": "Closed",
  "7558330f-4b0e-48fd-af40-ab57f38c4141": "Escalated to Dev",
  "4a6eb7bf-51b0-4f4e-ad07-40256b92fe5b": "Deleted",
};

// Calculate metrics
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
  
  // Calculate average resolution time
  const resolved = ticketsWithStatus.filter(t => t.status === "Resolved");
  const avgMs = resolved.length > 0
    ? resolved.reduce((acc, t) => acc + (t.updatedAt - t.createdAt), 0) / resolved.length
    : 0;
  const avgHours = Math.round(avgMs / (1000 * 60 * 60));
  const avgResolutionTime = avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d ${avgHours % 24}h`;
  
  // End of day counts
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

// Write to Google Sheets
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
  
  // Prepare row data
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
  
  // Append to sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Sheet1!A:K', // Adjust sheet name if needed
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row]
    }
  });
  
  console.log('✅ Metrics written to Google Sheets:', metrics);
}

// Main handler
export default async function handler(req, res) {
  try {
    console.log('🕐 Metrics cron started...');
    
    // Fetch tickets
    const tickets = await fetchTicketsFromGHL();
    console.log(`📊 Fetched ${tickets.length} tickets`);
    
    // Calculate metrics
    const metrics = calculateMetrics(tickets);
    console.log('📈 Calculated metrics:', metrics);
    
    // Write to Google Sheets
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