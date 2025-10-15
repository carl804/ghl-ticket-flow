import crypto from 'crypto';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN || process.env.GHL_ACCESS_TOKEN_TEMP;
const GHL_LOCATION_ID = process.env.VITE_GHL_LOCATION_ID || process.env.GHL_LOCATION_ID;
const GHL_PIPELINE_ID = 'p14Is7nXjiqS6MVI0cCk'; // Your tickets pipeline
const GHL_STAGE_OPEN = '3f3482b8-14c4-4de2-8a3c-4a336d01bb6e'; // "Open" stage

// Custom field IDs
const CUSTOM_FIELDS = {
  INTERCOM_CONVERSATION_ID: 'gk2kXQuactrb8OdIJ3El',
  TICKET_SOURCE: 'ZfA3rPJQiSU8wRuEFWYP',
  CUSTOMER_EMAIL: 'tpihNBgeALeCppnY3ir5',
  CATEGORY: 'BXohaPrmtGLyHJ0wz8F7',
  PRIORITY: 'u0oHrYV91ZX8KQMS8Crk',
};

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
      `intercom-${conversation.id}@temp.com`; // Fallback email if none provided
    
    const customerName = 
      conversation.source?.author?.name || 
      conversation.user?.name || 
      conversation.contacts?.contacts?.[0]?.name ||
      'Intercom Customer';
    
    const conversationId = conversation.id;

    console.log('📧 Creating ticket for:', { customerName, customerEmail, conversationId });

    // STEP 1: Find or create contact
    const contactId = await findOrCreateContact(customerEmail, customerName);

    // STEP 2: Create opportunity linked to contact
    const opportunityData = {
      pipelineId: GHL_PIPELINE_ID,
      locationId: GHL_LOCATION_ID,
      contactId: contactId, // ✅ CRITICAL: Link to contact
      name: `[Intercom] ${customerName}: ${firstMessage.substring(0, 60)}`,
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
        }
      ],
      monetaryValue: 0,
    };

    console.log('📤 Creating opportunity for contact:', contactId);

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
        hasAccessToken: !!GHL_ACCESS_TOKEN
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
    console.log('📦 Full payload:', JSON.stringify(payload, null, 2));

    // Handle different event types
    switch (payload.topic) {
      case 'conversation.user.created':
        console.log('🆕 New conversation from user');
        const conversation = payload.data.item;
        await createGHLTicketFromConversation(conversation);
        break;

      case 'conversation.user.replied':
        console.log('💬 User replied to conversation');
        // Optional: Update existing ticket or create new one
        break;

      case 'conversation.admin.closed':
        console.log('🔒 Admin closed conversation');
        // Optional: Update GHL ticket status to closed
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