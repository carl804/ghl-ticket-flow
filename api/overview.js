// Fetch live analytics from GHL instead of Google Sheets
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get GHL credentials from environment or request
    const accessToken = process.env.GHL_ACCESS_TOKEN || req.headers.authorization?.replace('Bearer ', '');
    const locationId = process.env.GHL_LOCATION_ID;

    if (!accessToken || !locationId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'GHL access token or location ID not found'
      });
    }

    const pipelineId = 'p14Is7nXjiqS6MVI0cCk';

    // Fetch all opportunities from GHL
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
    const opportunities = data.opportunities || [];

    // Stage mapping
    const STAGE_MAP = {
      "3f3482b8-14c4-4de2-8a3c-4a336d01bb6e": "Open",
      "bef596b8-d63d-40bd-b59a-5e0e474f1c8f": "In Progress",
      "4e24e27c-2e44-435b-bc1b-964e93518f20": "Resolved",
      "fdbed144-2dd3-48b7-981d-b0869082cc4e": "Closed",
      "7558330f-4b0e-48fd-af40-ab57f38c4141": "Escalated to Dev",
      "4a6eb7bf-51b0-4f4e-ad07-40256b92fe5b": "Deleted",
    };

    // Custom field ID for ticket owner
    const TICKET_OWNER_FIELD_ID = 'VYv1QpVAAgns13227Pii';

    // Helper to get custom field value
    function getCustomFieldValue(opp, fieldId) {
      const customFields = opp.customFields || [];
      const field = customFields.find(f => f.id === fieldId);
      return field?.fieldValue || field?.value || field?.field_value || '';
    }

    // Map tickets with status and assignee
    const tickets = opportunities.map(opp => ({
      id: opp.id,
      status: STAGE_MAP[opp.pipelineStageId] || "Open",
      assignedTo: getCustomFieldValue(opp, TICKET_OWNER_FIELD_ID) || "Unassigned",
      createdAt: new Date(opp.createdAt),
      updatedAt: new Date(opp.updatedAt),
    }));

    // Calculate metrics by agent
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

    // Calculate close rates and avg close times
    const agentMetrics = Array.from(agentMap.values()).map(metrics => {
      const closeRate = metrics.total > 0 
        ? ((metrics.closed / metrics.total) * 100).toFixed(0)
        : 0;

      // Calculate average close time for closed tickets
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

    // Calculate totals
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
    };

    return res.status(200).json(analyticsData);

  } catch (error) {
    console.error('Error fetching live analytics:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch analytics',
      details: error.message 
    });
  }
}