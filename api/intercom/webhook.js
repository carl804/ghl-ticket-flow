import crypto from 'crypto';
import { google } from 'googleapis';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN || process.env.GHL_ACCESS_TOKEN_TEMP;
const GHL_LOCATION_ID = process.env.VITE_GHL_LOCATION_ID || process.env.GHL_LOCATION_ID;
const GHL_PIPELINE_ID = 'p14Is7nXjiqS6MVI0cCk';
const GHL_STAGE_OPEN = '3f3482b8-14c4-4de2-8a3c-4a336d01bb6e';
const INTERCOM_ACCESS_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;

// Custom field IDs - UPDATED with both owner fields
const CUSTOM_FIELDS = {
  INTERCOM_CONVERSATION_ID: 'gk2kXQuactrb8OdIJ3El',
  TICKET_SOURCE: 'xITVHATbB7UzFdMQLenB',
  CUSTOMER_EMAIL: 'tpihNBgeALeCppnY3ir5',
  CATEGORY: 'BXohaPrmtGLyHJ0wz8F7',
  PRIORITY: 'u0oHrYV91ZX8KQMS8Crk',
  INTERCOM_TICKET_OWNER: 'TIkNFiv8JUDvj0FMVF0E', // Intercom Ticket Owner (Opp)
  TICKET_OWNER: 'VYv1QpVAAgns13227Pii',           // Ticket Owner (Opp) - SYNC with Intercom owner
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
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const COUNTER_TAB = 'Intercom Counter';

// CRITICAL: Disable Vercel's automatic body parsing for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to get raw body as string
const getRawBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
};

// Initialize Google Sheets
const getGoogleSheetsClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
};

// Get and increment ticket counter with retry logic
const getNextTicketNumber = async (retryCount = 0) => {
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
};

// Fetch full conversation details from Intercom API
const fetchIntercomConversation = async (conversationId) => {
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
    console.log('📦 admin_assignee_id from Intercom:', conversation.admin_assignee_id);
    console.log('📦 team_assignee_id from Intercom:', conversation.team_assignee_id);
    return conversation;
  } catch (error) {
    console.error('❌ Error fetching from Intercom API:', error);
    return null;
  }
};

// Map Intercom assignee to GHL dropdown value (reads from admin_assignee_id)
const mapIntercomAssigneeToGHL = (adminAssigneeId) => {
  console.log('🔍 Mapping admin_assignee_id:', adminAssigneeId);
  
  // Check if unassigned
  if (!adminAssigneeId || adminAssigneeId === null) {
    console.log('✅ No assignee detected (admin_assignee_id is null) - using Unassigned');
    return 'Unassigned';
  }
  
  const assigneeId = String(adminAssigneeId);
  const mappedName = INTERCOM_ASSIGNEE_MAP[assigneeId];
  
  if (mappedName) {
    console.log(`✅ Mapped assignee: ID ${assigneeId} → ${mappedName}`);
    return mappedName;
  }
  
  // Fallback: return Unassigned for unknown assignees
  console.warn(`⚠️ Unknown assignee ID ${assigneeId}, using Unassigned`);
  return 'Unassigned';
};

// Verify Intercom webhook signature
const verifyIntercomSignature = (body, signature) => {
  const secret = process.env.INTERCOM_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }

  // Detect algorithm from signature prefix (sha1= or sha256=)
  const algorithm = signature.startsWith('sha1=') ? 'sha1' : 'sha256';
  const [prefix] = signature.split('=');
  
  const hash = crypto
    .createHmac(algorithm, secret)
    .update(body)
    .digest('hex');

  const expectedSignature = `${prefix}=${hash}`;
  return expectedSignature === signature;
};

// Find or create contact in GHL and tag with "intercom"
const findOrCreateContact = async (email, name) => {
  try {
    // CRITICAL: Never accept Fin's email
    if (!email || email.includes('operator+') || email.includes('@intercom.io')) {
      console.error('❌ Refusing to search for Fin/operator email:', email);
      throw new Error('Invalid email - cannot use Fin or operator email');
    }
    
    console.log(`🔍 Searching for contact: ${email} (${name})`);
    
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
      // Filter out any Fin/operator contacts from results
      const validContacts = searchData.contacts.filter(contact => {
        const contactEmail = contact.email || '';
        const isFinContact = contactEmail.includes('operator+') || 
                            contactEmail.includes('@intercom.io') ||
                            contact.name === 'Fin';
        
        if (isFinContact) {
          console.warn('⚠️ Filtered out Fin/operator contact from search results:', contact.id);
          return false;
        }
        return true;
      });
      
      if (validContacts.length > 0) {
        const existingContact = validContacts[0];
        console.log(`✅ Found existing valid contact: ${existingContact.id} (${existingContact.name})`);
        
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
    }

    // Create new contact with intercom tag
    console.log('➕ Creating new contact with email:', email, 'name:', name);
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
          const extractedId = match[1];
          console.log(`✅ Extracted existing contact ID: ${extractedId}`);
          
          // Verify this isn't Fin's contact
          const verifyResponse = await fetch(`${GHL_API_BASE}/contacts/${extractedId}`, {
            headers: {
              Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
              Version: '2021-07-28',
            },
          });
          
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            const verifyEmail = verifyData.contact?.email || '';
            
            if (verifyEmail.includes('operator+') || verifyEmail.includes('@intercom.io')) {
              console.error('❌ Extracted contact is Fin! Refusing to use it.');
              throw new Error('Cannot use Fin contact');
            }
          }
          
          return extractedId;
        }
      }
      
      throw new Error(`Failed to create contact: ${errorText}`);
    }

    const newContact = await createResponse.json();
    const newContactId = newContact.contact.id;
    console.log(`✅ Created new contact: ${newContactId} (${name} - ${email})`);
    return newContactId;

  } catch (error) {
    console.error('❌ Error with contact:', error);
    throw error;
  }
};

// Create GHL ticket from Intercom conversation
const createGHLTicketFromConversation = async (conversation) => {
  try {
    const conversationId = conversation.id;
    
    // Fetch full conversation from Intercom API to get accurate customer info
    console.log('🔍 Fetching full conversation to get real customer info...');
    const fullConversation = await fetchIntercomConversation(conversationId);
    
    if (!fullConversation) {
      console.error('❌ Could not fetch full conversation from Intercom');
      return;
    }
    
    // Get customer info - log EVERYTHING to find where real customer is
    console.log('🔍 FULL CONVERSATION:', JSON.stringify(fullConversation, null, 2));
    console.log('🔍 source:', fullConversation.source);
    console.log('🔍 contacts:', fullConversation.contacts);

    // Try to get the real customer (not Fin)
    let customer = null;
    let customerEmail = '';
    let customerName = '';

    // Option 1: From contacts array (PRIORITIZE THIS - real customer is here)
    if (fullConversation.contacts?.contacts?.[0]) {
      const contactId = fullConversation.contacts.contacts[0].id;
      console.log('🔍 Found contact ID, fetching full details:', contactId);
      
      // Fetch full contact details from Intercom
      try {
        const contactResponse = await fetch(`https://api.intercom.io/contacts/${contactId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
            'Accept': 'application/json',
            'Intercom-Version': '2.11'
          }
        });
        
        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          console.log('✅ Raw contact data from Intercom:', JSON.stringify(contactData, null, 2));
          
          // Extract email - try multiple possible locations
          const email = contactData.email || 
                        contactData.primary_email ||
                        (contactData.emails && contactData.emails.length > 0 ? contactData.emails[0] : '') ||
                        '';
          
          const name = contactData.name || 
                       contactData.display_name ||
                       email ||
                       'Unknown Customer';
          
          console.log('🔍 Extracted from contact:', { email, name });
          
          // CRITICAL: Only use this contact if it has a real email and is NOT Fin/operator
          if (email && 
              !email.includes('operator+') && 
              !email.includes('@intercom.io') &&
              name !== 'Fin') {
            customer = contactData;
            customerEmail = email;
            customerName = name;
            console.log('✅ Found real customer from contacts:', { name: customerName, email: customerEmail });
          } else {
            console.warn('⚠️ Contact is Fin/operator or has no valid email:', { email, name });
          }
        } else {
          console.error('❌ Failed to fetch contact details:', contactResponse.status);
        }
      } catch (error) {
        console.error('❌ Error fetching contact:', error);
      }
    }

    // Option 2: From source.author (only if not Fin/bot and Option 1 failed)
    if (!customer && fullConversation.source?.author?.type === 'user') {
      const author = fullConversation.source.author;
      const email = author.email || '';
      const name = author.name || email || 'Unknown Customer';
      
      // Skip if it's Fin or operator email
      if (email && 
          !email.includes('operator+') && 
          !email.includes('@intercom.io') &&
          name !== 'Fin') {
        customer = author;
        customerEmail = email;
        customerName = name;
        console.log('✅ Found customer in source.author:', { name: customerName, email: customerEmail });
      } else {
        console.log('⚠️ Skipping Fin/operator in source.author:', { email, name });
      }
    }

    // Option 3: From user object (legacy fallback)
    if (!customer && fullConversation.user) {
      const user = fullConversation.user;
      const email = user.email || '';
      const name = user.name || email || 'Unknown Customer';
      
      if (email && !email.includes('operator+') && !email.includes('@intercom.io')) {
        customer = user;
        customerEmail = email;
        customerName = name;
        console.log('✅ Found customer in user:', { name: customerName, email: customerEmail });
      }
    }
    
    // Final validation - make absolutely sure we're not using Fin
    if (!customer || !customerEmail || customerEmail.includes('operator+') || customerName === 'Fin') {
      console.error('❌ No valid customer found or customer is Fin/operator');
      console.error('❌ Customer details:', { name: customerName, email: customerEmail });
      return;
    }

    console.log('✅ FINAL Real customer:', { name: customerName, email: customerEmail });
    
    // Get ticket number
    const ticketNumber = await getNextTicketNumber();
    const ticketName = `[Intercom] #${ticketNumber} - ${customerName}`;
    
    // Get assignee from admin_assignee_id
    const adminAssigneeId = fullConversation?.admin_assignee_id;
    
    console.log('📦 Final admin_assignee_id to process:', adminAssigneeId);
    const ghlAssignee = mapIntercomAssigneeToGHL(adminAssigneeId);
    
    // Find or create contact with intercom tag - using VALIDATED customer details
    console.log('🔍 About to find/create contact with:', { email: customerEmail, name: customerName });
    const contactId = await findOrCreateContact(customerEmail, customerName);
    console.log('✅ Got GHL contact ID:', contactId);
    
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
          {
            id: CUSTOM_FIELDS.TICKET_OWNER,
            field_value: ghlAssignee, // ✅ SYNC: Set both owner fields to same value
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
    console.log(`✅ Assigned to: ${ghlAssignee} (both owner fields synced)`);
    console.log(`✅ Linked to contact: ${contactId} (${customerName} - ${customerEmail})`);
    
  } catch (error) {
    console.error('❌ Error creating GHL ticket:', error);
    throw error;
  }
};

// Update ticket assignee when conversation assignment changes
const updateTicketAssignment = async (conversationId) => {
  try {
    console.log(`🔍 Searching for ticket with Intercom ID: ${conversationId}`);
    
    // Fetch full conversation from Intercom API
    const fullConversation = await fetchIntercomConversation(conversationId);
    if (!fullConversation) {
      console.error('❌ Could not fetch conversation from Intercom API');
      return;
    }

    const newAssignee = mapIntercomAssigneeToGHL(fullConversation.admin_assignee_id);
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
    
    // Update BOTH ticket owner fields to keep them in sync
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
            {
              id: CUSTOM_FIELDS.TICKET_OWNER,
              field_value: newAssignee, // ✅ SYNC: Update both owner fields
            },
          ],
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update ticket: ${errorText}`);
    }

    console.log(`✅ Updated ticket owner to: ${newAssignee} (both fields synced)`);
    
  } catch (error) {
    console.error('❌ Error updating ticket assignment:', error);
    throw error;
  }
};

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
        hasWebhookSecret: !!process.env.INTERCOM_WEBHOOK_SECRET,
        assigneesConfigured: Object.keys(INTERCOM_ASSIGNEE_MAP).length
      }
    });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get RAW body for signature verification (BEFORE parsing)
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-hub-signature'];
    
    // Verify signature BEFORE parsing JSON
    const secret = process.env.INTERCOM_WEBHOOK_SECRET;
    
    if (!secret) {
      console.warn('⚠️ INTERCOM_WEBHOOK_SECRET not set - skipping signature verification');
      console.warn('⚠️ This is a SECURITY RISK! Set INTERCOM_WEBHOOK_SECRET in your environment variables');
    } else if (signature) {
      if (!verifyIntercomSignature(rawBody, signature)) {
        console.error('❌ Invalid Intercom signature');
        console.error('🔍 Expected signature format: sha256=...');
        console.error('🔍 Received:', signature);
        return res.status(401).json({ error: 'Invalid signature' });
      }
      console.log('✅ Signature verified');
    } else {
      console.warn('⚠️ No signature provided in webhook request');
    }
    
    // NOW parse the JSON
    const payload = JSON.parse(rawBody);
    
    console.log('🔍 Full webhook data:', JSON.stringify(payload, null, 2));
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