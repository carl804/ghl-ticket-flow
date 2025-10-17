const AGENT_INTERCOM_MAP = {
  'Aneela': '6465865',
  'Aneela Karim': '6465865',
  'Carl': '9123839',
  'Carl James Salamida': '9123839',
  'Chloe': '4310906',
  'Chloe Helton': '4310906',
  'Christian': '8815155',
  'Christian Falcon': '8815155',
  'Jonathan': '5326930',
  'Jonathan Vicenta': '5326930',
  'Joyce': '7023191',
  'Joyce Vicenta': '7023191',
  'Mark': '1755792',
  'Mark Helton': '1755792',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { conversationId, action, agentName, intercomAdminId, snoozedUntil } = req.body;

  if (!conversationId || !action) {
    return res.status(400).json({ error: 'Conversation ID and action required' });
  }

  try {
    const INTERCOM_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;

    // Priority: Use provided intercomAdminId > map from agentName > fallback to env
    let adminId = intercomAdminId;
    
    if (!adminId && agentName) {
      adminId = AGENT_INTERCOM_MAP[agentName];
    }
    
    if (!adminId) {
      adminId = process.env.INTERCOM_ADMIN_ID;
    }

    let payload = {};

    if (action === 'close') {
      payload = {
        message_type: 'close',
        type: 'admin',
        admin_id: adminId
      };
    } else if (action === 'snooze') {
      payload = {
        message_type: 'snoozed',
        type: 'admin',
        admin_id: adminId,
        snoozed_until: snoozedUntil || Math.floor(Date.now() / 1000) + (3600 * 24)
      };
    } else if (action === 'assign') {
      // Assign conversation to admin
      const assignResponse = await fetch(
        `https://api.intercom.io/conversations/${conversationId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${INTERCOM_TOKEN}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Intercom-Version': '2.11'
          },
          body: JSON.stringify({
            assignee_id: adminId
          })
        }
      );

      if (!assignResponse.ok) {
        const errorData = await assignResponse.json();
        throw new Error(`Failed to assign: ${JSON.stringify(errorData)}`);
      }

      const assignData = await assignResponse.json();
      return res.status(200).json({ success: true, data: assignData });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const response = await fetch(
      `https://api.intercom.io/conversations/${conversationId}/reply`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${INTERCOM_TOKEN}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Intercom-Version': '2.11'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Intercom API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error performing action:', error);
    return res.status(500).json({
      error: 'Failed to perform action',
      details: error.message
    });
  }
}