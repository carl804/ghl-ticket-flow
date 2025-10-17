export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { conversationId } = req.query;

  if (!conversationId) {
    return res.status(400).json({ error: 'Conversation ID required' });
  }

  try {
    const INTERCOM_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;

    // Fetch conversation details
    const conversationResponse = await fetch(
      `https://api.intercom.io/conversations/${conversationId}`,
      {
        headers: {
          'Authorization': `Bearer ${INTERCOM_TOKEN}`,
          'Accept': 'application/json',
          'Intercom-Version': '2.11'
        }
      }
    );

    if (!conversationResponse.ok) {
      const errorData = await conversationResponse.json();
      throw new Error(`Intercom API error: ${conversationResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const conversation = await conversationResponse.json();

    return res.status(200).json({
      success: true,
      conversation
    });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    return res.status(500).json({
      error: 'Failed to fetch conversation',
      details: error.message
    });
  }
}