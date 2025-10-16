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
  TICKET_SOURCE: 'xITVHATbB7UzFdMQLenB', // ✅ CORRECT field ID for "Ticket Source"
  CUSTOMER_EMAIL: 'tpihNBgeALeCppnY3ir5',
  CATEGORY: 'BXohaPrmtGLyHJ0wz8F7',
  PRIORITY: 'u0oHrYV91ZX8KQMS8Crk',
  INTERCOM_TICKET_OWNER: 'TIkNFiv8JUDvj0FMVF0E',
};

// Intercom Admin ID to GHL Name Mapping
const INTERCOM_ASSIGNEE_MAP = {
  '1755792': 'Mark',
  '4310906': 'Chloe',
  '5326930': 'Jonathan',
  '6465865': 'Aneela',
  '7023191': 'Joyce',
  '8815155': 'Christian',
  '9123839': 'Carl',
};

// Intercom Tag Name
const INTERCOM_TAG = 'intercom';

// Google Sheets Setup
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const COUNTER_TAB = 'Intercom Counter';

// Initialize Google Sheets
function getGoogleSheetsClient() {
  const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!credentials) {
    throw new Error('Google Sheets credentials not found in environment variables');
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentials),
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
    return String(nextNumber).padStart(5, '0');
    
  } catch (error) {
    console.error('❌ Error getting ticket number:', error);
    const fallback = String(Date.now()).slice(-5);
    console.log('⚠️ Using fallback number:', fallback);
    return fallback;
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
    console.log('🔍 Looking for contact:', email);

    let contactId = null;

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
        contactId = searchData.contacts[0].id;
        console.log('✅ Found existing contact:', contactId);
      }
    }

    // If not found, create new contact
    if (!contactId) {
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
          source: 'Intercom',
          tags: [INTERCOM_TAG]
        })
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        
        if (errorData.statusCode === 400 && errorData.meta?.contactId) {
          contactId = errorData.meta.contactId;
          console.log('✅ Contact already exists, using existing ID:', contactId);
        } else {
          throw new Error(`Failed to create contact: ${createResponse.status} ${JSON.stringify(errorData)}`);
        }
      } else {
        const newContact = await createResponse.json();
        contactId = newContact.contact.id;
        console.log('✅ Created new contact:', contactId);
      }
    }

    // Add "intercom" tag to contact (for both new and existing)
    console.log('🏷️ Adding intercom tag to contact:', contactId);
    const tagResponse = await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        tags: [INTERCOM_TAG]
      })
    });

    if (tagResponse.ok) {
      console.log('✅ Tagged contact as "intercom"');
    } else {
      console.warn('⚠️ Failed to tag contact, but continuing:', await tagResponse.text());
    }

    return contactId;

  } catch (error) {
    console.error('❌ Error with contact:', error);
    throw error;
  }
}

// Create GHL ticket from Intercom conversation
async function createGHLTicketFromConversation(conversation) {
  try {
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
    const assignee = conversation.assignee;
    const ticketOwner = mapIntercomAssigneeToGHL(assignee);

    console.log('📧 Creating ticket for:', { 
      customerName, 
      customerEmail, 
      conversationId,
      assignee: assignee?.name || 'Unassigned',
      ticketOwner 
    });

    const ticketNumber = await getNextTicketNumber();
    const contactId = await findOrCreateContact(customerEmail, customerName);

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

// Update GHL ticket owner when Intercom assignee changes
async function updateGHLTicketOwner(conversation) {
  try {
    const conversationId = conversation.id;
    const newAssignee = conversation.assignee;
    const ticketOwner = mapIntercomAssigneeToGHL(newAssignee);

    console.log('🔄 Assignee changed for conversation:', conversationId);
    console.log('🔄 New assignee:', newAssignee?.name || 'Unassigned', '→', ticketOwner);

    // Find the GHL opportunity by Intercom Conversation ID
    const searchUrl = `${GHL_API_BASE}/opportunities/search?location_id=${GHL_LOCATION_ID}&pipeline_id=${GHL_PIPELINE_ID}`;
    console.log('🔍 Searching for ticket with URL:', searchUrl);
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${GHL_ACCESS_TOKEN}`,
        'Version': '2021-07-28'
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`Failed to search opportunities: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    console.log(`📋 Found ${searchData.opportunities?.length || 0} total tickets in pipeline`);
    
    // Find the opportunity with matching Intercom Conversation ID
    const matchingOpportunity = searchData.opportunities?.find(opp => {
      const intercomIdField = opp.customFields?.find(
        cf => cf.id === CUSTOM_FIELDS.INTERCOM_CONVERSATION_ID
      );
      console.log(`🔍 Checking ticket ${opp.name}: Intercom ID field = ${intercomIdField?.value}`);
      return intercomIdField?.value === conversationId || intercomIdField?.value === String(conversationId);
    });

    if (!matchingOpportunity) {
      console.warn('⚠️ No matching GHL ticket found for conversation:', conversationId);
      console.warn('⚠️ Searched for Intercom Conversation ID custom field:', CUSTOM_FIELDS.INTERCOM_CONVERSATION_ID);
      console.warn('⚠️ Make sure the ticket has this custom field set correctly');
      return;
    }

    console.log('✅ Found matching ticket:', matchingOpportunity.id, '-', matchingOpportunity.name);

    // Update the Intercom Ticket Owner field
    const updateUrl = `${GHL_API_BASE}/opportunities/${matchingOpportunity.id}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GHL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        customFields: [
          {
            id: CUSTOM_FIELDS.INTERCOM_TICKET_OWNER,
            value: ticketOwner
          }
        ]
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update opportunity: ${updateResponse.status} ${errorText}`);
    }

    console.log('✅ Updated ticket owner to:', ticketOwner);

  } catch (error) {
    console.error('❌ Error updating ticket owner:', error);
  }
}

export default async function handler(req, res) {
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
        assigneesConfigured: Object.keys(INTERCOM_ASSIGNEE_MAP).length,
        intercomTag: INTERCOM_TAG
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-hub-signature'];
    const body = JSON.stringify(req.body);

    if (signature && process.env.NODE_ENV === 'production') {
      if (!verifyIntercomSignature(body, signature)) {
        console.error('❌ Invalid Intercom signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      console.log('✅ Signature verified');
    }

    const payload = req.body;
    console.log('📨 Received Intercom webhook:', payload.topic);

    switch (payload.topic) {
      case 'conversation.user.created':
        console.log('🆕 New conversation from user');
        const conversation = payload.data.item;
        
        // 🔍 DEBUG: Log the full conversation structure to find where the name is
        console.log('📦 Full conversation object:', JSON.stringify(conversation, null, 2));
        console.log('📦 Source:', JSON.stringify(conversation.source, null, 2));
        console.log('📦 User:', JSON.stringify(conversation.user, null, 2));
        console.log('📦 Contacts:', JSON.stringify(conversation.contacts, null, 2));
        
        await createGHLTicketFromConversation(conversation);
        break;

      case 'conversation.admin.assigned':
        console.log('👤 Admin assigned to conversation');
        const assignedConversation = payload.data.item;
        
        // 🔍 DEBUG: Log assignment details
        console.log('📦 Assignee info:', JSON.stringify(assignedConversation.assignee, null, 2));
        console.log('📦 Conversation ID:', assignedConversation.id);
        
        await updateGHLTicketOwner(assignedConversation);
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