export default async function handler(req, res) {
  try {
    const accessToken = process.env.GHL_ACCESS_TOKEN_TEMP || process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!accessToken || !locationId) {
      return res.status(500).json({ error: 'Missing credentials' });
    }

    const response = await fetch(
      `https://services.leadconnectorhq.com/opportunities/search?location_id=${locationId}&pipeline_id=p14Is7nXjiqS6MVI0cCk&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    return res.json({
      sampleOpportunity: data.opportunities?.[0] || null,
      totalOpportunities: data.opportunities?.length || 0
    });

  } catch (error) {
    return res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch opportunity data'
    });
  }
}