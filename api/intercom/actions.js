const AGENT_INTERCOM_MAP = {
  'Aneela': '6465865',
  'Aneela Karim': '6465865',
  'Carl': '9123839',
  'Carl James Salamida': '9123839',
  'Chloe': '4310906',
  'Chloe Helton': '4310906',
  'Christian': '8815155',
  'Christian Falcon': '8815155',
  'Jonathan': '5326930',
  'Jonathan Vicenta': '5326930',
  'Joyce': '7023191',
  'Joyce Vicenta': '7023191',
  'Mark': '1755792',
  'Mark Helton': '1755792',
};

// GHL Config
const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN || process.env.GHL_ACCESS_TOKEN_TEMP;
const GHL_LOCATION_ID = process.env.VITE_GHL_LOCATION_ID || process.env.GHL_LOCATION_ID;
const GHL_PIPELINE_ID = 'p14Is7nXjiqS6MVI0cCk';
const CUSTOM_FIELD_INTERCOM_CONVERSATION_ID = 'gk2kXQuactrb8OdIJ3El';
const CUSTOM_FIELD_INTERCOM_TICKET_OWNER = 'TIkNFiv8JUDvj0FMVF0E';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { conversationId, action, agentName, intercomAdminId, snoozedUntil } = req.body;

  if (!conversationId || !action) {
    return res.status(400).json({ error: 'Conversation ID and action required' });
  }

  try {
    const INTERCOM_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;

    // Priority: Use provided intercomAdminId > map from agentName > fallback to env
    let adminId = intercomAdminId;
    
    if (!adminId && agentName) {
      adminId = AGENT_INTERCOM_MAP[agentName];
    }
    
    if (!adminId) {
      adminId = process.env.INTERCOM_ADMIN_ID;
    }

    let payload = {};

    if (action === 'close') {
      payload = {
        message_type: 'close',
        type: 'admin',
        admin_id: adminId
      };
    } else if (action === 'snooze') {
      payload = {
        message_type: 'snoozed',
        type: 'admin',
        admin_id: adminId,
        snoozed_until: snoozedUntil || Math.floor(Date.now() / 1000) + (3600 * 24)
      };
    } else if (action === 'assign') {
      console.log(`🔄 Assigning conversation ${conversationId} to ${agentName}`);
      
      // Assign conversation to admin in Intercom
      const assignResponse = await fetch(
        `https://api.intercom.io/conversations/${conversationId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${INTERCOM_TOKEN}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Intercom-Version': '2.11'
          },
          body: JSON.stringify({
            assignee_id: adminId
          })
        }
      );

      if (!assignResponse.ok) {
        const errorData = await assignResponse.json();
        throw new Error(`Failed to assign: ${JSON.stringify(errorData)}`);
      }

      const assignData = await assignResponse.json();
      console.log('✅ Assigned in Intercom');

      // ✅ NOW UPDATE GHL OPPORTUNITY
      if (agentName && GHL_ACCESS_TOKEN) {
        try {
          console.log('🔍 Searching for GHL ticket...');
          
          // Search for ticket by Intercom conversation ID
          const searchUrl = `${GHL_API_BASE}/opportunities/search?location_id=${GHL_LOCATION_ID}&pipeline_id=${GHL_PIPELINE_ID}`;
          const searchResponse = await fetch(searchUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
              Version: '2021-07-28',
            },
          });

          if (!searchResponse.ok) {
            throw new Error('GHL search failed');
          }

          const searchData = await searchResponse.json();
          
          // Find ticket with matching Intercom conversation ID
          const matchingTicket = searchData.opportunities?.find(opp => {
            const intercomIdField = opp.customFields?.find(
              field => field.id === CUSTOM_FIELD_INTERCOM_CONVERSATION_ID
            );
            const ticketIntercomId = intercomIdField?.fieldValueString || intercomIdField?.value;
            return ticketIntercomId === conversationId;
          });

          if (matchingTicket) {
            console.log(`✅ Found ticket: ${matchingTicket.id}`);
            
            // Update Intercom Ticket Owner custom field
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
                      id: CUSTOM_FIELD_INTERCOM_TICKET_OWNER,
                      field_value: agentName,
                    },
                  ],
                }),
              }
            );

            if (updateResponse.ok) {
              console.log(`✅ Updated GHL ticket owner to: ${agentName}`);
            } else {
              console.error('❌ Failed to update GHL');
            }
          } else {
            console.warn('⚠️ No GHL ticket found');
          }
        } catch (ghlError) {
          console.error('❌ GHL update error:', ghlError);
          // Don't fail - Intercom assignment succeeded
        }
      }

      return res.status(200).json({ success: true, data: assignData });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const response = await fetch(
      `https://api.intercom.io/conversations/${conversationId}/reply`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${INTERCOM_TOKEN}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Intercom-Version': '2.11'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Intercom API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error performing action:', error);
    return res.status(500).json({
      error: 'Failed to perform action',
      details: error.message
    });
  }
}