import { google } from 'googleapis';

// Intercom Admin ID to GHL Name Mapping (same as webhook)
const INTERCOM_ASSIGNEE_MAP = {
  '1755792': 'Mark',
  '3603553': 'Bot',
  '4310906': 'Chloe',
  '5326930': 'Jonathan',
  '6465865': 'Aneela',
  '7023191': 'Joyce',
  '8815155': 'Christian',
  '8958425': 'Sana',
  '9123839': 'Carl',
};

// Google Sheets Setup
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const COUNTER_TAB = 'Intercom Counter';

// Initialize Google Sheets
function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// Get and increment ticket counter with retry logic (COPIED FROM WEBHOOK)
async function getNextTicketNumber(retryCount = 0) {
  const MAX_RETRIES = 3;
  
  try {
    const sheets = getGoogleSheetsClient();
    
    console.log(`📊 Attempting to get counter (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
    
    // Read current counter
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${COUNTER_TAB}!B2`,
    });
    
    const currentNumber = parseInt(response.data.values?.[0]?.[0] || '0');
    const nextNumber = currentNumber + 1;
    
    console.log(`📊 Current counter: ${currentNumber}, Next: ${nextNumber}`);
    
    // Update counter
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${COUNTER_TAB}!B2`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[nextNumber]],
      },
    });
    
    console.log(`✅ Successfully generated ticket number: ${nextNumber}`);
    return String(nextNumber).padStart(5, '0'); // "00001"
    
  } catch (error) {
    console.error(`❌ Error getting ticket number (attempt ${retryCount + 1}):`, error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error details:', error);
    
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      console.log(`🔄 Retrying in ${waitTime}ms... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return getNextTicketNumber(retryCount + 1);
    }
    
    // All retries failed - use fallback
    console.error('❌ All retries exhausted. Using timestamp fallback.');
    console.error('⚠️ THIS SHOULD BE INVESTIGATED - Check Google Sheets permissions and quotas');
    
    const fallback = String(Date.now()).slice(-5);
    console.error(`⚠️ Fallback ticket number: ${fallback}`);
    
    return fallback;
  }
}

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
    pipelineId: PIPELINE_ID,
    stageId: STAGE_ID
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
    
    if (!GHL_TOKEN || !LOCATION_ID) {
      console.error('❌ Missing GHL credentials:', {
        hasToken: !!GHL_TOKEN,
        hasLocationId: !!LOCATION_ID
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
      
      // Get next ticket number from Google Sheets
      const ticketNumber = await getNextTicketNumber();
      console.log('🎫 Ticket number from sheets:', ticketNumber);
      
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
            per_page: 20
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
        // Get ALL messages (source + parts) to find the absolute latest
        const sourceMsgTime = conv.source?.created_at || 0;
        const parts = conv.conversation_parts?.conversation_parts || [];
        
        // Start with source message as the latest
        let latestMessage = {
          body: conv.source?.body || '',
          author: conv.source?.author,
          created_at: sourceMsgTime,
        };
        
        // Check all parts and find the one with the latest timestamp
        parts.forEach(part => {
          if (part.created_at > latestMessage.created_at) {
            latestMessage = {
              body: part.body,
              author: part.author,
              created_at: part.created_at,
            };
          }
        });
        
        // Strip HTML and get preview text
        let lastMessageBody = '';
        if (latestMessage.body) {
          lastMessageBody = latestMessage.body.replace(/<[^>]*>/g, '').trim();
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
          
          // Assignee info - read from admin_assignee_id and map to names
          assignee: (() => {
            const adminId = conv.admin_assignee_id;
            if (!adminId) return null;
            
            const assigneeName = INTERCOM_ASSIGNEE_MAP[String(adminId)] || 'Unknown';
            return {
              id: adminId,
              name: assigneeName,
              type: 'admin',
            };
          })(),
          
          // Last message preview (FIXED - shows absolute latest by timestamp)
          lastMessage: {
            body: lastMessageBody,
            author: latestMessage.author?.name || 'Unknown',
            authorType: latestMessage.author?.type || 'user',
            createdAt: latestMessage.created_at || conv.updated_at,
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