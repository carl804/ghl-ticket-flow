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
    console.log('Starting daily metrics logging...');
    
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

    // TODO: Step 3 - Fetch full details and count by stage
    // TODO: Step 4 - Count new today
    // TODO: Step 5 - Read Stage Transitions sheet
    // TODO: Step 6 - Calculate metrics
    // TODO: Step 7 - Write to Google Sheets

    return res.status(200).json({ 
      success: true,
      message: 'Step 2 complete - fetched opportunity IDs',
      opportunityCount: opportunityIds.length
    });
  } catch (error) {
    console.error('Error logging daily metrics:', error);
    return res.status(500).json({ 
      error: 'Failed to log daily metrics',
      details: error.message 
    });
  }
}