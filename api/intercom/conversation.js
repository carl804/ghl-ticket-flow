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
  
  // ========================================
  // POST: Create ticket from conversation
  // ========================================
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
      
      // 🚨🚨🚨 EXTREME DEBUG - LOG EVERYTHING 🚨🚨🚨
      console.log('🚨🚨🚨 FULL CONVERSATION OBJECT START 🚨🚨🚨');
      console.log(JSON.stringify(conversation, null, 2));
      console.log('🚨🚨🚨 FULL CONVERSATION OBJECT END 🚨🚨🚨');
      
      console.log('🔍🔍🔍 DETAILED BREAKDOWN:');
      console.log('📌 conversation.source:', JSON.stringify(conversation.source, null, 2));
      console.log('📌 conversation.source.author:', JSON.stringify(conversation.source?.author, null, 2));
      console.log('📌 conversation.contacts:', JSON.stringify(conversation.contacts, null, 2));
      console.log('📌 conversation.contacts.contacts:', JSON.stringify(conversation.contacts?.contacts, null, 2));
      
      if (conversation.contacts?.contacts?.[0]) {
        console.log('👤 FIRST CONTACT DETAILS:', JSON.stringify(conversation.contacts.contacts[0], null, 2));
      }
      
      // Extract customer info
      const customerName = conversation.source?.author?.name ||
                           conversation.contacts?.contacts?.[0]?.name ||
                           'Unknown Customer';
      const customerEmail = conversation.source?.author?.email ||
                            conversation.contacts?.contacts?.[0]?.email;
      
      console.log('✅✅✅ EXTRACTED CUSTOMER INFO:');
      console.log('  👤 Name:', customerName);
      console.log('  📧 Email:', customerEmail);
      console.log('  🔍 Source author type:', conversation.source?.author?.type);
      console.log('  🔍 Source author name:', conversation.source?.author?.name);
      console.log('  🔍 Source author email:', conversation.source?.author?.email);
      
      // Find or create contact in GHL
      let contactId;
      
      if (customerEmail) {
        console.log('🔎 Searching for existing contact with email:', customerEmail);
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
            console.log('✅ Found existing contact:', contactId);
          } else {
            console.log('⚠️ No existing contact found');
          }
        } else {
          console.log('⚠️ Contact search failed:', contactSearchResponse.status);
        }
      } else {
        console.log('⚠️ No email provided, cannot search for existing contact');
      }
      
      // Create contact if needed
      if (!contactId) {
        console.log('📝 Creating new contact in GHL...');
        console.log('📝 Contact data:', { name: customerName, email: customerEmail });
        
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
          const errorText = await createContactResponse.text();
          console.error('❌ Failed to create contact:', errorText);
          throw new Error('Failed to create contact in GHL');
        }
        
        const contactData = await createContactResponse.json();
        contactId = contactData.contact.id;
        console.log('✅ Created new contact:', contactId);
        console.log('✅ Contact details:', JSON.stringify(contactData.contact, null, 2));
      }
      
      // Get next ticket number from Google Sheets
      const ticketNumber = await getNextTicketNumber();
      console.log('🎫 Ticket number from sheets:', ticketNumber);
      
      // Create opportunity in GHL
      const oppPayload = {
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
      };
      
      console.log('📤 Creating opportunity with payload:', JSON.stringify(oppPayload, null, 2));
      
      const createOppResponse = await fetch(
        `https://services.leadconnectorhq.com/opportunities/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GHL_TOKEN}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(oppPayload)
        }
      );
      
      if (!createOppResponse.ok) {
        const errorData = await createOppResponse.json();
        console.error('❌ Failed to create opportunity:', JSON.stringify(errorData, null, 2));
        throw new Error(`Failed to create opportunity: ${JSON.stringify(errorData)}`);
      }
      
      const oppData = await createOppResponse.json();
      
      console.log('✅✅✅ Ticket created successfully!');
      console.log('  🎫 Ticket ID:', oppData.opportunity.id);
      console.log('  🎫 Ticket Number:', ticketNumber);
      console.log('  🎫 Ticket Name:', oppData.opportunity.name);
      console.log('  👤 Contact ID:', contactId);
      console.log('  👤 Contact Name:', customerName);
      console.log('  📧 Contact Email:', customerEmail);
      
      return res.status(200).json({
        success: true,
        ticketId: oppData.opportunity.id,
        ticketNumber: ticketNumber,
        message: 'Ticket created successfully'
      });
    
    } catch (error) {
      console.error('❌❌❌ ERROR CREATING TICKET:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      return res.status(500).json({
        error: 'Failed to create ticket',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
  
  // ========================================
  // GET: Handle all GET requests
  // ========================================
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { conversationId, fetchMacros } = req.query;
  
  console.log('📝 Query params:', { conversationId, fetchMacros });
  console.log('🔑 Token exists:', !!INTERCOM_TOKEN);
  
  try {
    // ========================================
    // CASE 1: Fetch MACROS (NEW!)
    // ========================================
    if (fetchMacros === 'true') {
      console.log('💬 Fetching Intercom macros...');
      
      const response = await fetch('https://api.intercom.io/macros?per_page=150', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${INTERCOM_TOKEN}`,
          'Accept': 'application/json',
          'Intercom-Version': 'Unstable'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Intercom API error:', errorText);
        return res.status(response.status).json({ 
          error: 'Failed to fetch macros from Intercom',
          details: errorText 
        });
      }

      const data = await response.json();
      
      // Extract and format macros
      const macros = data.data.map(macro => ({
        id: macro.id,
        name: macro.name,
        bodyPlain: macro.body_plain,
        bodyHtml: macro.body_html,
        createdAt: macro.created_at,
        updatedAt: macro.updated_at
      }));

      // Sort by name for easier browsing
      macros.sort((a, b) => a.name.localeCompare(b.name));

      console.log(`✅ Fetched ${macros.length} macros`);

      return res.status(200).json({
        success: true,
        macros,
        count: macros.length,
        lastUpdated: macros.length > 0 ? macros[0].updatedAt : null,
        fetchedAt: new Date().toISOString()
      });
    }
    
    // ========================================
    // CASE 2: Fetch ALL conversations (inbox list)
    // ========================================
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
      
      // Fetch full conversation details for each to get ALL parts
      const conversationsWithDetails = await Promise.all(
        data.conversations.map(async (conv) => {
          try {
            // Fetch full conversation to get all parts
            const fullConvResponse = await fetch(
              `https://api.intercom.io/conversations/${conv.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${INTERCOM_TOKEN}`,
                  'Accept': 'application/json',
                  'Intercom-Version': '2.11'
                }
              }
            );
            
            if (fullConvResponse.ok) {
              return await fullConvResponse.json();
            }
            return conv; // Fallback to original if fetch fails
          } catch (error) {
            console.error(`Error fetching conversation ${conv.id}:`, error);
            return conv; // Fallback to original
          }
        })
      );
      
      const conversations = conversationsWithDetails.map(conv => {
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
        // Only consider actual messages (comments), not system messages
        parts.forEach(part => {
          if (part.part_type === 'comment' && part.body && part.created_at > latestMessage.created_at) {
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
          
          // Customer info - CHECK CONTACTS FIRST (real customer), then source
customer: (() => {
  // Option 1: Check contacts array FIRST (real customer is here)
  const contact = conv.contacts?.contacts?.[0];
  if (contact) {
    const contactName = contact.name;
    const contactEmail = contact.email;
    
    // Use contact if it's NOT Fin
    if (contactName && contactName !== 'Fin' && 
        !contactEmail?.includes('operator+') && !contactEmail?.includes('@intercom.io')) {
      return {
        id: contact.id,
        name: contactName,
        email: contactEmail,
        type: contact.type || 'user',
      };
    }
  }
  
  // Option 2: Fallback to source.author (only if contacts didn't work)
  const author = conv.source?.author;
  if (author) {
    const sourceName = author.name;
    const sourceEmail = author.email;
    
    if (sourceName && sourceName !== 'Fin' &&
        !sourceEmail?.includes('operator+') && !sourceEmail?.includes('@intercom.io')) {
      return {
        id: author.id,
        name: sourceName,
        email: sourceEmail,
        type: author.type,
      };
    }
  }
  
  // Final fallback
  return {
    id: contact?.id || author?.id,
    name: 'Unknown',
    email: contact?.email || author?.email,
    type: 'user',
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
    
    // ========================================
    // CASE 3: Fetch SINGLE conversation details
    // ========================================
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