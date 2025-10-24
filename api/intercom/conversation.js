export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { conversationId } = req.query;
  const INTERCOM_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;

  if (!INTERCOM_TOKEN) {
    return res.status(500).json({ error: 'Intercom token not configured' });
  }

  try {
    // CASE 1: Fetch ALL conversations (inbox list)
    if (!conversationId) {
      const response = await fetch('https://api.intercom.io/conversations/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${INTERCOM_TOKEN}`,
          'Content-Type': 'application/json',
          'Intercom-Version': '2.11',
        },
        body: JSON.stringify({
          query: {
            operator: 'AND',
            value: [
              {
                field: 'state',
                operator: '=',
                value: 'open'
              }
            ]
          },
          pagination: {
            per_page: 50
          },
          sort: {
            field: 'updated_at',
            order: 'descending'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Intercom API error:', errorText);
        return res.status(response.status).json({ 
          error: 'Failed to fetch conversations',
          details: errorText 
        });
      }

      const data = await response.json();
      
      // Transform conversations for inbox display
      const conversations = data.conversations.map(conv => {
        const parts = conv.conversation_parts?.conversation_parts || [];
        const lastPart = parts.length > 0 ? parts[parts.length - 1] : null;
        const lastMessage = lastPart || conv.source;

        // Get last message body (strip HTML)
        let lastMessageBody = '';
        if (lastMessage?.body) {
          lastMessageBody = lastMessage.body.replace(/<[^>]*>/g, '').trim();
        }

        // Truncate to 60 characters for preview
        if (lastMessageBody.length > 60) {
          lastMessageBody = lastMessageBody.substring(0, 60) + '...';
        }

        return {
          id: conv.id,
          state: conv.state,
          read: conv.read,
          priority: conv.priority,
          
          // Customer info
          customer: {
            id: conv.source?.author?.id || conv.contacts?.contacts?.[0]?.id,
            name: conv.source?.author?.name || conv.contacts?.contacts?.[0]?.name || 'Unknown',
            email: conv.source?.author?.email || conv.contacts?.contacts?.[0]?.email,
            type: conv.source?.author?.type,
          },
          
          // Assignee info
          assignee: conv.assignee ? {
            id: conv.assignee.id,
            name: conv.assignee.name,
            type: conv.assignee.type,
          } : null,
          
          // Last message preview
          lastMessage: {
            body: lastMessageBody,
            author: lastMessage?.author?.name || 'Unknown',
            authorType: lastMessage?.author?.type,
            createdAt: lastMessage?.created_at,
          },
          
          // Message counts
          messageCount: parts.length + 1,
          
          // Timestamps
          createdAt: conv.created_at,
          updatedAt: conv.updated_at,
          
          // Tags/Topics
          tags: conv.tags?.tags || [],
          topics: conv.topics?.topics || [],
        };
      });

      // Calculate total unread count
      const unreadCount = conversations.filter(c => !c.read).length;

      return res.status(200).json({
        success: true,
        type: 'list',
        conversations,
        total: conversations.length,
        unreadCount,
      });
    }

    // CASE 2: Fetch SINGLE conversation details
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
      type: 'single',
      conversation
    });

  } catch (error) {
    console.error('Error fetching conversation(s):', error);
    return res.status(500).json({
      error: 'Failed to fetch conversation(s)',
      details: error.message
    });
  }
}