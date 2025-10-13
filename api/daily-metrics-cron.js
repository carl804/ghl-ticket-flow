import { google } from 'googleapis';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

// Stage ID to name mapping (same as agent-perf)
const STAGE_MAP = {
  "3f3482b8-14c4-4de2-8a3c-4a336d01bb6e": "Open",
  "bef596b8-d63d-40bd-b59a-5e0e474f1c8f": "In Progress",
  "4e24e27c-2e44-435b-bc1b-964e93518f20": "Resolved",
  "fdbed144-2dd3-48b7-981d-b0869082cc4e": "Closed",
  "7558330f-4b0e-48fd-af40-ab57f38c4141": "Escalated to Dev",
  "4a6eb7bf-51b0-4f4e-ad07-40256b92fe5b": "Deleted",
};

async function getGHLAccessToken() {
  // Use access token directly (temporary solution)
  const accessToken = process.env.GHL_ACCESS_TOKEN_TEMP;
  
  if (!accessToken) {
    throw new Error('GHL_ACCESS_TOKEN_TEMP not found in environment variables');
  }
  
  return accessToken;
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting daily metrics logging...');
    
    // STEP 1: Get access token
    const accessToken = await getGHLAccessToken();
    console.log('✅ Got access token');

    const locationId = process.env.VITE_GHL_LOCATION_ID || process.env.GHL_LOCATION_ID;
    
    // STEP 2: Get all opportunity IDs from pipeline
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
    
    console.log(`✅ Found ${opportunityIds.length} opportunity IDs`);

    // STEP 3: Fetch full details for each opportunity
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

    console.log(`✅ Fetched full details for ${fullOpportunities.length} opportunities`);

    // Count by stage
    const stageCounts = {
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      escalated: 0,
      total: fullOpportunities.length
    };

    fullOpportunities.forEach(opp => {
      const stage = STAGE_MAP[opp.pipelineStageId] || 'Open';
      if (stage === 'Open') stageCounts.open++;
      if (stage === 'In Progress') stageCounts.inProgress++;
      if (stage === 'Resolved') stageCounts.resolved++;
      if (stage === 'Closed') stageCounts.closed++;
      if (stage === 'Escalated to Dev') stageCounts.escalated++;
    });

    console.log('✅ Stage counts:', stageCounts);

    // STEP 4: Count tickets created today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today (UTC)
    const todayTimestamp = today.getTime();

    let newToday = 0;
    fullOpportunities.forEach(opp => {
      const createdAt = new Date(opp.createdAt).getTime();
      if (createdAt >= todayTimestamp) {
        newToday++;
      }
    });

    console.log(`✅ New tickets today: ${newToday}`);

    // TODO: Step 5 - Read Stage Transitions sheet
    // TODO: Step 6 - Calculate metrics
    // TODO: Step 7 - Write to Google Sheets

    return res.status(200).json({ 
      success: true,
      message: 'Step 4 complete - counted new today',
      stageCounts,
      newToday
    });
  } catch (error) {
    console.error('Error logging daily metrics:', error);
    return res.status(500).json({ 
      error: 'Failed to log daily metrics',
      details: error.message 
    });
  }
}
// STEP 5: Read Stage Transitions sheet to count transitions today
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Read all stage transitions
    const transitionsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Stage Transitions!A:H',
    });

    const transitionsRows = transitionsResponse.data.values || [];
    console.log(`✅ Read ${transitionsRows.length} stage transition rows`);

    // Count transitions TO each stage that happened today
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    let closedToday = 0;
    let resolvedToday = 0;
    let escalatedToday = 0;

    transitionsRows.slice(1).forEach(row => { // Skip header
      const timestamp = row[0]; // Column A
      const toStage = row[3]; // Column D (To Stage)
      
      if (timestamp && timestamp.startsWith(todayStr)) {
        if (toStage === 'Closed') closedToday++;
        if (toStage === 'Resolved') resolvedToday++;
        if (toStage === 'Escalated to Dev') escalatedToday++;
      }
    });

    console.log(`✅ Transitions today - Closed: ${closedToday}, Resolved: ${resolvedToday}, Escalated: ${escalatedToday}`);

    // TODO: Step 6 - Calculate metrics
    // TODO: Step 7 - Write to Google Sheets

    return res.status(200).json({ 
      success: true,
      message: 'Step 5 complete - read stage transitions',
      stageCounts,
      newToday,
      transitionsToday: { closedToday, resolvedToday, escalatedToday }
    });