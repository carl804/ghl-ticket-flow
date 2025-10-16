import crypto from 'crypto';
import { google } from 'googleapis';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN || process.env.GHL_ACCESS_TOKEN_TEMP;
const GHL_LOCATION_ID = process.env.VITE_GHL_LOCATION_ID || process.env.GHL_LOCATION_ID;
const GHL_PIPELINE_ID = 'p14Is7nXjiqS6MVI0cCk';
const GHL_STAGE_OPEN = '3f3482b8-14c4-4de2-8a3c-4a336d01bb6e';

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
  '1767611': 'Operator',
  '4310906': 'Chloe',
  '5326930': 'Jonathan',
  '6465865': 'Aneela',
  '7023191': 'Joyce',
  '8815155': 'Christian',
  '9123839': 'Carl',
};

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

// Map Intercom assignee to GHL dropdown value
function mapIntercomAssigneeToGHL(assignee) {
  if (!assignee || assignee.type === 'nobody_admin') {
    return 'Unassigned';
  }
  
  const assigneeId = String(assignee.id);
  const mappedName = INTERCOM_ASSIGNEE_MAP[assigneeId];
  
  if (mappedName) {
    console.log(`✅ Mapped assignee: ${assignee.name} (${assigneeId}) → ${mappedName}`);
    return mappedName;
  }
  
  // Fallback: try to extract first name
  const firstName = assignee.name?.split(' ')[0];
  console.warn(`⚠️ Unknown assignee ID ${assigneeId} (${assignee.name}), using first name: ${firstName}`);
  return firstName || 'Unassigned';
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

// Find or create contact in GHL
async function findOrCreateContact(email, name) {
  try {
    console.log('🔍 Looking for contact:', email);

    // First, try to find existing contact
    const searchUrl = `${GHL_API_BASE}/contacts/search?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(email)}`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${GHL_ACCESS_TOKEN}`,
        'Version': '2021-07-28'
      }
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.contacts && searchData.contacts.length > 0) {
        console.log('✅ Found existing contact:', searchData.contacts[0].id);
        return searchData.contacts[0].id;
      }
    }

    // If not found, create new contact
    console.log('📝 Creating new contact for:', email);
    const createResponse = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        email: email,
        name: name || 'Intercom Customer',
        source: 'Intercom'
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create contact: ${createResponse.status} ${errorText}`);
    }

    const newContact = await createResponse.json();
    console.log('✅ Created new contact:', newContact.contact.id);
    return newContact.contact.id;

  } catch (error) {
    console.error('❌ Error with contact:', error);
    throw error;
  }
}

// Create GHL ticket from Intercom conversation
async function createGHLTicketFromConversation(conversation) {
  try {
    // Extract conversation details
    const firstMessage = 
      conversation.source?.body || 
      conversation.conversation_message?.body || 
      conversation.first_contact_reply?.body ||
      'No message content';
    
    const customerEmail = 
      conversation.source?.author?.email || 
      conversation.user?.email || 
      conversation.contacts?.contacts?.[0]?.email ||
      `intercom-${conversation.id}@temp.com`;
    
    const customerName = 
      conversation.source?.author?.name || 
      conversation.user?.name || 
      conversation.contacts?.contacts?.[0]?.name ||
      'Intercom Customer';
    
    const conversationId = conversation.id;
    
    // Extract and map assignee
    const assignee = conversation.assignee;
    const ticketOwner = mapIntercomAssigneeToGHL(assignee);

    console.log('📧 Creating ticket for:', { 
      customerName, 
      customerEmail, 
      conversationId,
      assignee: assignee?.name || 'Unassigned',
      ticketOwner 
    });

    // STEP 1: Get next ticket number
    const ticketNumber = await getNextTicketNumber();

    // STEP 2: Find or create contact
    const contactId = await findOrCreateContact(customerEmail, customerName);

    // STEP 3: Create opportunity with ticket number and owner
    const opportunityData = {
      pipelineId: GHL_PIPELINE_ID,
      locationId: GHL_LOCATION_ID,
      contactId: contactId,
      name: `[Intercom] #${ticketNumber} - ${customerName}`,
      pipelineStageId: GHL_STAGE_OPEN,
      status: 'open',
      customFields: [
        {
          id: CUSTOM_FIELDS.INTERCOM_CONVERSATION_ID,
          value: conversationId
        },
        {
          id: CUSTOM_FIELDS.TICKET_SOURCE,
          value: 'Intercom'
        },
        {
          id: CUSTOM_FIELDS.CUSTOMER_EMAIL,
          value: customerEmail
        },
        {
          id: CUSTOM_FIELDS.CATEGORY,
          value: 'Uncategorized'
        },
        {
          id: CUSTOM_FIELDS.PRIORITY,
          value: 'Medium'
        },
        {
          id: CUSTOM_FIELDS.INTERCOM_TICKET_OWNER,
          value: ticketOwner
        }
      ],
      monetaryValue: 0,
    };

    console.log('📤 Creating opportunity:', opportunityData.name, '| Owner:', ticketOwner);

    const response = await fetch(`${GHL_API_BASE}/opportunities/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(opportunityData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GHL API Error:', errorText);
      throw new Error(`Failed to create GHL opportunity: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Created GHL ticket:', result.opportunity.id);
    return result;

  } catch (error) {
    console.error('❌ Error creating GHL ticket:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Handle GET requests (for testing)
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok',
      message: 'Intercom webhook endpoint is ready',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      config: {
        pipeline: GHL_PIPELINE_ID,
        location: GHL_LOCATION_ID,
        hasAccessToken: !!GHL_ACCESS_TOKEN,
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