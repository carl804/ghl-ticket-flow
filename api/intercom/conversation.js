export default async function handler(req, res) {
  console.log('🔥 API called - Method:', req.method, 'Query:', req.query);
  console.log('📦 Request body:', req.body);
  console.log('📦 Request body type:', typeof req.body);
  
  const INTERCOM_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;
  const GHL_TOKEN = process.env.GHL_ACCESS_TOKEN_TEMP;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;
  
  // Hardcoded values (same as in webhook)
  const PIPELINE_ID = 'p14Is7nXjiqS6MVI0cCk'; // Ticketing System pipeline
  const STAGE_ID = '3f3482b8-14c4-4de2-8a3c-4a336d01bb6e'; // Open stage

  console.log('🔑 Environment variables check:', {
    hasIntercomToken: !!INTERCOM_TOKEN,
    hasGhlToken: !!GHL_TOKEN,
    hasLocationId: !!LOCATION_ID,
    hasPipelineId: !!PIPELINE_ID,
    hasStageId: !!STAGE_ID
  });

  if (!INTERCOM_TOKEN) {
    return res.status(500).json({ error: 'Intercom token not configured' });
  }

  // Handle POST request - Create ticket from conversation
  if (req.method === 'POST') {
    const { conversationId } = req.body;

    console.log('📝 POST Request Body:', req.body);
    console.log('🎫 conversationId from body:', conversationId);

    if (!conversationId) {
      console.error('❌ Missing conversationId in request body');
      return res.status(400).json({ error: 'conversationId is required' });
    }

    if (!GHL_TOKEN || !LOCATION_ID || !PIPELINE_ID || !STAGE_ID) {
      console.error('❌ Missing GHL credentials:', {
        hasToken: !!GHL_TOKEN,
        hasLocationId: !!LOCATION_ID,
        hasPipelineId: !!PIPELINE_ID,
        hasStageId: !!STAGE_ID
      });
      return res.status(500).json({ error: 'GHL credentials not configured' });
    }

    try {
      console.log('🎫 Creating ticket for conversation:', conversationId);

      // Fetch conversation details
      const convResponse = await fetch(
        `https://api.intercom.io/conversations/${conversationId}`,
        {
          headers: {
            'Authorization': `Bearer ${INTERCOM_TOKEN}`,
            'Accept': 'application/json',
            'Intercom-Version': '2.11'
          }
        }
      );

      if (!convResponse.ok) {
        throw new Error('Failed to fetch conversation from Intercom');
      }

      const conversation = await convResponse.json();

      // Extract customer info
      const customerName = conversation.source?.author?.name || 
                          conversation.contacts?.contacts?.[0]?.name || 
                          'Unknown Customer';
      const customerEmail = conversation.source?.author?.email || 
                           conversation.contacts?.contacts?.[0]?.email;

      // Find or create contact in GHL
      let contactId;

      if (customerEmail) {
        const contactSearchResponse = await fetch(
          `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${LOCATION_ID}&email=${encodeURIComponent(customerEmail)}`,
          {
            headers: {
              'Authorization': `Bearer ${GHL_TOKEN}`,
              'Version': '2021-07-28',
            }
          }
        );

        if (contactSearchResponse.ok) {
          const searchData = await contactSearchResponse.json();
          if (searchData.contact) {
            contactId = searchData.contact.id;
          }
        }
      }

      // Create contact if needed
      if (!contactId) {
        const createContactResponse = await fetch(
          `https://services.leadconnectorhq.com/contacts/`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GHL_TOKEN}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              locationId: LOCATION_ID,
              name: customerName,
              email: customerEmail || undefined,
            })
          }
        );

        if (!createContactResponse.ok) {
          throw new Error('Failed to create contact in GHL');
        }

        const contactData = await createContactResponse.json();
        contactId = contactData.contact.id;
      }

      // Get next ticket number
      const ticketsResponse = await fetch(
        `https://services.leadconnectorhq.com/opportunities/search?location_id=${LOCATION_ID}&pipelineId=${PIPELINE_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${GHL_TOKEN}`,
            'Version': '2021-07-28',
          }
        }
      );

      let nextTicketNumber = 1;
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        const intercomTickets = (ticketsData.opportunities || []).filter(opp => 
          opp.name && opp.name.includes('[Intercom]')
        );
        
        if (intercomTickets.length > 0) {
          const numbers = intercomTickets.map(ticket => {
            const match = ticket.name.match(/#(\d+)/);
            return match ? parseInt(match[1]) : 0;
          });
          nextTicketNumber = Math.max(...numbers) + 1;
        }
      }

      const ticketNumber = String(nextTicketNumber).padStart(5, '0');

      // Create opportunity in GHL
      const createOppResponse = await fetch(
        `https://services.leadconnectorhq.com/opportunities/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GHL_TOKEN}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locationId: LOCATION_ID,
            pipelineId: PIPELINE_ID,
            pipelineStageId: STAGE_ID,
            contactId: contactId,
            name: `[Intercom] #${ticketNumber} - ${customerName}`,
            status: 'open',
            customFields: [
              {
                key: 'gk2kXQuactrb8OdIJ3El', // intercomConversationId
                field_value: conversationId
              },
              {
                key: 'ZfA3rPJQiSU8wRuEFWYP', // ticketSource
                field_value: 'Intercom'
              }
            ]
          })
        }
      );

      if (!createOppResponse.ok) {
        const errorData = await createOppResponse.json();
        throw new Error(`Failed to create opportunity: ${JSON.stringify(errorData)}`);
      }

      const oppData = await createOppResponse.json();

      console.log('✅ Ticket created:', oppData.opportunity.id);

      return res.status(200).json({
        success: true,
        ticketId: oppData.opportunity.id,
        ticketNumber: ticketNumber,
        message: 'Ticket created successfully'
      });

    } catch (error) {
      console.error('❌ Error creating ticket:', error);
      console.error('❌ Error stack:', error.stack);
      return res.status(500).json({
        error: 'Failed to create ticket',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Handle GET request - Fetch conversations
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { conversationId } = req.query;

  console.log('📝 conversationId:', conversationId);
  console.log('🔑 Token exists:', !!INTERCOM_TOKEN);

  try {
    // CASE 1: Fetch ALL conversations (inbox list)
    if (!conversationId) {
      const startTime = Date.now();
      console.log('📋 Fetching ALL conversations (inbox list)...');
      
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
            per_page: 20 // Reduced from 50 to 20 for faster loading
          },
          sort: {
            field: 'updated_at',
            order: 'descending'
          }
        })
      });

      const fetchTime = Date.now() - startTime;
      console.log(`⏱️ Intercom API responded in ${fetchTime}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Intercom API error:', errorText);
        return res.status(response.status).json({ 
          error: 'Failed to fetch conversations',
          details: errorText 
        });
      }

      const data = await response.json();
      const parseTime = Date.now() - startTime;
      console.log(`⏱️ Parsed response in ${parseTime}ms`);
      
      // Transform conversations for inbox display
      const transformStart = Date.now();
      const conversations = data.conversations.map(conv => {
        // Get conversation parts (replies)
        const parts = conv.conversation_parts?.conversation_parts || [];
        
        // Get the ACTUAL last message (newest reply or original message)
        let lastMessage = conv.source; // Start with original message
        let lastMessageBody = '';
        
        if (parts.length > 0) {
          // Get the very last part (most recent message)
          const lastPart = parts[parts.length - 1];
          lastMessage = {
            body: lastPart.body,
            author: lastPart.author,
            created_at: lastPart.created_at,
          };
        }

        // Strip HTML and get preview text
        if (lastMessage?.body) {
          lastMessageBody = lastMessage.body.replace(/<[^>]*>/g, '').trim();
          // Truncate to 80 characters for preview
          if (lastMessageBody.length > 80) {
            lastMessageBody = lastMessageBody.substring(0, 80) + '...';
          }
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
          
          // Last message preview (FIXED - now shows actual latest message)
          lastMessage: {
            body: lastMessageBody,
            author: lastMessage?.author?.name || 'Unknown',
            authorType: lastMessage?.author?.type || 'user',
            createdAt: lastMessage?.created_at || conv.updated_at,
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

      const totalTime = Date.now() - startTime;
      console.log(`⏱️ Transformed ${conversations.length} conversations in ${Date.now() - transformStart}ms`);
      console.log(`✅ Total inbox load time: ${totalTime}ms`);

      return res.status(200).json({
        success: true,
        type: 'list',
        conversations,
        total: conversations.length,
        unreadCount,
      });
    }

    // CASE 2: Fetch SINGLE conversation details
    console.log('💬 Fetching SINGLE conversation:', conversationId);
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