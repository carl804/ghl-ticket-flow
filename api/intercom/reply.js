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

  const { conversationId, message, isNote, agentName, intercomAdminId } = req.body;

  if (!conversationId || !message) {
    return res.status(400).json({ error: 'Conversation ID and message required' });
  }

  try {
    const INTERCOM_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;

    // Priority: Use provided intercomAdminId > map from agentName > fallback to env
    let adminId = intercomAdminId;
    
    if (!adminId && agentName) {
      adminId = AGENT_INTERCOM_MAP[agentName];
      console.log(`✅ Mapped agent "${agentName}" to Intercom ID: ${adminId}`);
    }
    
    if (!adminId) {
      adminId = process.env.INTERCOM_ADMIN_ID; // Support Team fallback
      console.log('⚠️ Using fallback Support Team admin');
    }

    const payload = {
      message_type: isNote ? 'note' : 'comment',
      type: 'admin',
      admin_id: adminId,
      body: message
    };

    console.log('Sending reply with payload:', payload);

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
    console.error('Error sending reply:', error);
    return res.status(500).json({
      error: 'Failed to send reply',
      details: error.message
    });
  }
}