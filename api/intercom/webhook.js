import crypto from 'crypto';
import { google } from 'googleapis';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN || process.env.GHL_ACCESS_TOKEN_TEMP;
const GHL_LOCATION_ID = process.env.VITE_GHL_LOCATION_ID || process.env.GHL_LOCATION_ID;
const GHL_PIPELINE_ID = 'p14Is7nXjiqS6MVI0cCk';
const GHL_STAGE_OPEN = '3f3482b8-14c4-4de2-8a3c-4a336d01bb6e';
const INTERCOM_ACCESS_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;

// Custom field IDs
const CUSTOM_FIELDS = {
  INTERCOM_CONVERSATION_ID: 'gk2kXQuactrb8OdIJ3El',
  TICKET_SOURCE: 'ZfA3rPJQiSU8wRuEFWYP',
  CUSTOMER_EMAIL: 'tpihNBgeALeCppnY3ir5',
  CATEGORY: 'BXohaPrmtGLyHJ0wz8F7',
  PRIORITY: 'u0oHrYV91ZX8KQMS8Crk',
  INTERCOM_TICKET_OWNER: 'TIkNFiv8JUDvj0FMVF0E',
};

// Intercom Admin ID to GHL Name Mapping
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

// Intercom Tag ID
const INTERCOM_TAG_ID = 'qEOvf8oLOGrOAq0SUAAF';

// Google Sheets Setup
const SHEET_ID = process.env.GOOGLE_SHEET_ID_INTERCOM;
const COUNTER_TAB = 'Intercom Counter';

// Initialize Google Sheets
function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// Get and increment ticket counter
async function getNextTicketNumber() {
  try {
    const sheets = getGoogleSheetsClient();
    
    // Read current counter
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${COUNTER_TAB}!B2`,
    });
    
    const currentNumber = parseInt(response.data.values?.[0]?.[0] || '0');
    const nextNumber = currentNumber + 1;
    
    // Update counter
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${COUNTER_TAB}!B2`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[nextNumber]],
      },
    });
    
    console.log(`✅ Generated ticket number: ${nextNumber}`);
    return String(nextNumber).padStart(5, '0'); // "00001"
    
  } catch (error) {
    console.error('❌ Error getting ticket number:', error);
    // Fallback: use timestamp-based number
    return String(Date.now()).slice(-5);
  }
}

// Fetch full conversation details from Intercom API
async function fetchIntercomConversation(conversationId) {
  if (!INTERCOM_ACCESS_TOKEN) {
    console.warn('⚠️ INTERCOM_ACCESS_TOKEN not set - cannot fetch conversation details');
    return null;
  }

  try {
    console.log(`🔍 Fetching conversation ${conversationId} from Intercom API...`);
    const response = await fetch(`https://api.intercom.io/conversations/${conversationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
        'Accept': 'application/json',
        'Intercom-Version': '2.11'
      }
    });

    if (!response.ok) {
      console.error(`❌ Intercom API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const conversation = await response.json();
    console.log('✅ Fetched conversation from Intercom API');
    console.log('📦 Assignee from API:', JSON.stringify(conversation.assignee, null, 2));
    return conversation;
  } catch (error) {
    console.error('❌ Error fetching from Intercom API:', error);
    return null;
  }
}

// Map Intercom assignee to GHL dropdown value
function mapIntercomAssigneeToGHL(assignee) {
  console.log('🔍 Mapping assignee:', JSON.stringify(assignee));
  
  // Check multiple conditions for unassigned
  if (!assignee || 
      assignee.type === 'nobody_admin' || 
      assignee.id === null ||
      assignee.id === undefined) {
    console.log('✅ No assignee detected (nobody_admin or null) - using Unassigned');
    return 'Unassigned';
  }
  
  const assigneeId = String(assignee.id);
  const mappedName = INTERCOM_ASSIGNEE_MAP[assigneeId];
  
  if (mappedName) {
    console.log(`✅ Mapped assignee: ${assignee.name} (${assigneeId}) → ${mappedName}`);
    return mappedName;
  }
  
  // Fallback: return Unassigned for unknown assignees
  console.warn(`⚠️ Unknown assignee ID ${assigneeId} (${assignee.name}), using Unassigned`);
  return 'Unassigned';
}

// Verify Intercom webhook signature
function verifyIntercomSignature(body, signature) {
  const secret = process.env.INTERCOM_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('⚠️ INTERCOM_WEBHOOK_SECRET not set - skipping signature verification');
    return true;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return `sha256=${hash}` === signature;
}

// Find or create contact in GHL and tag with "intercom"
async function findOrCreateContact(email, name) {
  try {
    console.log(`🔍 Searching for contact: ${email}`);
    
    // Search for existing contact
    const searchResponse = await fetch(
      `${GHL_API_BASE}/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
          Version: '2021-07-28',
        },
      }
    );

    const searchData = await searchResponse.json();
    
    if (searchData.contacts && searchData.contacts.length > 0) {
      const existingContact = searchData.contacts[0];
      console.log(`✅ Found existing contact: ${existingContact.id}`);
      
      // Check if already has intercom tag
      const hasTags = existingContact.tags && existingContact.tags.includes('intercom');
      
      if (!hasTags) {
        console.log('🏷️ Adding intercom tag to existing contact...');
        await fetch(`${GHL_API_BASE}/contacts/${existingContact.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            Version: '2021-07-28',
          },
          body: JSON.stringify({
            tags: [...(existingContact.tags || []), 'intercom']
          }),
        });
      }
      
      return existingContact.id;
    }

    // Create new contact with intercom tag
    console.log('➕ Creating new contact...');
    const createResponse = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
      },
      body: JSON.stringify({
        email,
        name,
        locationId: GHL_LOCATION_ID,
        tags: ['intercom'],
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      
      // Handle duplicate contact error
      if (errorText.includes('Contact already exists')) {
        console.warn('⚠️ Contact already exists (race condition), extracting ID...');
        const match = errorText.match(/"id":"([^"]+)"/);
        if (match) {
          console.log(`✅ Extracted existing contact ID: ${match[1]}`);
          return match[1];
        }
      }
      
      throw new Error(`Failed to create contact: ${errorText}`);
    }

    const newContact = await createResponse.json();
    console.log(`✅ Created new contact: ${newContact.contact.id}`);
    return newContact.contact.id;

  } catch (error) {
    console.error('❌ Error with contact:', error);
    throw error;
  }
}

// Create GHL ticket from Intercom conversation
async function createGHLTicketFromConversation(conversation) {
  try {
    const conversationId = conversation.id;
    const user = conversation.user || conversation.source?.author;
    
    if (!user) {
      console.error('❌ No user found in conversation');
      return;
    }

    const customerName = user.name || user.email || 'Unknown';
    const customerEmail = user.email || '';
    
    // Get ticket number
    const ticketNumber = await getNextTicketNumber();
    const ticketName = `[Intercom] #${ticketNumber} - ${customerName}`;
    
    // Fetch full conversation from Intercom API to get accurate assignee
    const fullConversation = await fetchIntercomConversation(conversationId);
    const assignee = fullConversation?.assignee || conversation.assignee;
    
    console.log('📦 Final assignee to process:', JSON.stringify(assignee));
    const ghlAssignee = mapIntercomAssigneeToGHL(assignee);
    
    // Find or create contact with intercom tag
    const contactId = await findOrCreateContact(customerEmail, customerName);
    
    // Create opportunity (ticket) in GHL
    console.log('🎫 Creating ticket in GHL...');
    const opportunityResponse = await fetch(`${GHL_API_BASE}/opportunities/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
      },
      body: JSON.stringify({
        name: ticketName,
        pipelineId: GHL_PIPELINE_ID,
        pipelineStageId: GHL_STAGE_OPEN,
        status: 'open',
        contactId: contactId,
        locationId: GHL_LOCATION_ID,
        customFields: [
          {
            id: CUSTOM_FIELDS.INTERCOM_CONVERSATION_ID,
            field_value: conversationId,
          },
          {
            id: CUSTOM_FIELDS.TICKET_SOURCE,
            field_value: 'Intercom',
          },
          {
            id: CUSTOM_FIELDS.CUSTOMER_EMAIL,
            field_value: customerEmail,
          },
          {
            id: CUSTOM_FIELDS.INTERCOM_TICKET_OWNER,
            field_value: ghlAssignee,
          },
        ],
      }),
    });

    if (!opportunityResponse.ok) {
      const errorText = await opportunityResponse.text();
      throw new Error(`Failed to create opportunity: ${errorText}`);
    }

    const opportunity = await opportunityResponse.json();
    console.log(`✅ Created ticket: ${opportunity.opportunity.id} - ${ticketName}`);
    console.log(`✅ Assigned to: ${ghlAssignee}`);
    
  } catch (error) {
    console.error('❌ Error creating GHL ticket:', error);
    throw error;
  }
}

// Update ticket assignee when conversation assignment changes
async function updateTicketAssignment(conversationId) {
  try {
    console.log(`🔍 Searching for ticket with Intercom ID: ${conversationId}`);
    
    // Fetch full conversation from Intercom API
    const fullConversation = await fetchIntercomConversation(conversationId);
    if (!fullConversation) {
      console.error('❌ Could not fetch conversation from Intercom API');
      return;
    }

    const newAssignee = mapIntercomAssigneeToGHL(fullConversation.assignee);
    console.log(`🔄 New assignee from Intercom: ${newAssignee}`);
    
    // Search for the ticket in GHL by Intercom Conversation ID
    const searchUrl = `${GHL_API_BASE}/opportunities/search?location_id=${GHL_LOCATION_ID}&pipeline_id=${GHL_PIPELINE_ID}`;
    console.log('🔍 Searching for ticket with URL:', searchUrl);
    console.log('🔍 Using location ID:', GHL_LOCATION_ID);
    console.log('🔍 Using pipeline ID:', GHL_PIPELINE_ID);
    console.log('🔍 Using access token:', GHL_ACCESS_TOKEN ? 'SET' : 'NOT SET');
    
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
      },
    });

    console.log('📡 Search response status:', searchResponse.status);
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('❌ Search failed:', errorText);
      return;
    }

    const searchData = await searchResponse.json();
    console.log('📦 Raw search response:', JSON.stringify(searchData, null, 2));
    console.log(`📋 Found ${searchData.opportunities?.length || 0} total tickets in pipeline`);
    
    // Find the ticket with matching Intercom Conversation ID
    console.log('🔍 Checking all tickets for matching Intercom Conversation ID...');
    const matchingTicket = searchData.opportunities?.find(opp => {
      const intercomIdField = opp.customFields?.find(
        field => field.id === CUSTOM_FIELDS.INTERCOM_CONVERSATION_ID
      );
      const ticketIntercomId = intercomIdField?.fieldValueString || intercomIdField?.value;
      console.log(`- Ticket: ${opp.name} | Intercom ID: ${ticketIntercomId || 'NOT SET'}`);
      return ticketIntercomId === conversationId;
    });

    if (!matchingTicket) {
      console.error(`❌ No ticket found with Intercom ID: ${conversationId}`);
      return;
    }

    console.log(`✅ Found matching ticket: ${matchingTicket.id} - ${matchingTicket.name}`);
    
    // Update the ticket's Intercom Ticket Owner field
    const updateResponse = await fetch(
      `${GHL_API_BASE}/opportunities/${matchingTicket.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Version: '2021-07-28',
        },
        body: JSON.stringify({
          customFields: [
            {
              id: CUSTOM_FIELDS.INTERCOM_TICKET_OWNER,
              field_value: newAssignee,
            },
          ],
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update ticket: ${errorText}`);
    }

    console.log(`✅ Updated ticket owner to: ${newAssignee}`);
    
  } catch (error) {
    console.error('❌ Error updating ticket assignment:', error);
    throw error;
  }
}

// Main webhook handler
export default async function handler(req, res) {
  // Health check for GET requests
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'Intercom webhook endpoint is ready',
      config: {
        hasAccessToken: !!GHL_ACCESS_TOKEN,
        hasIntercomToken: !!INTERCOM_ACCESS_TOKEN,
        hasSheetId: !!SHEET_ID,
        assigneesConfigured: Object.keys(INTERCOM_ASSIGNEE_MAP).length
      }
    });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get signature for verification
    const signature = req.headers['x-hub-signature'];
    const body = JSON.stringify(req.body);

    // Verify signature (optional for initial testing)
    if (signature && process.env.NODE_ENV === 'production') {
      if (!verifyIntercomSignature(body, signature)) {
        console.error('❌ Invalid Intercom signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      console.log('✅ Signature verified');
    }

    // Parse the webhook payload
    const payload = req.body;
    console.log('📨 Received Intercom webhook:', payload.topic);

    // Handle different event types
    switch (payload.topic) {
      case 'conversation.user.created':
        console.log('🆕 New conversation from user');
        const conversation = payload.data.item;
        await createGHLTicketFromConversation(conversation);
        break;

      case 'conversation.admin.assigned':
        console.log('👤 Admin assigned to conversation');
        const assignedConvo = payload.data.item;
        console.log('📦 Assignee info:', JSON.stringify(assignedConvo.assignee));
        console.log('📦 Conversation ID:', assignedConvo.id);
        console.log(`🔄 Assignee changed for conversation: ${assignedConvo.id}`);
        await updateTicketAssignment(assignedConvo.id);
        break;

      case 'conversation.user.replied':
        console.log('💬 User replied to conversation');
        break;

      case 'conversation.admin.closed':
        console.log('🔒 Admin closed conversation');
        break;

      default:
        console.log('ℹ️ Unhandled event type:', payload.topic);
    }

    return res.status(200).json({ 
      received: true,
      topic: payload.topic,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}