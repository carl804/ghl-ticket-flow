import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId, messages, opportunityId, forceRegenerate = false } = req.body;

    if (!conversationId || !messages) {
      return res.status(400).json({ error: 'Missing conversationId or messages' });
    }

    // Calculate conversation fingerprint
    const messageCount = messages.length;
    const lastMessageId = messages[messages.length - 1]?.id || messages[messages.length - 1]?.created_at || '';
    
    // Check cache first (unless force regenerate)
    if (!forceRegenerate && opportunityId) {
      const cachedSummary = await getCachedSummary(opportunityId);
      
      if (cachedSummary && 
          cachedSummary.messageCount === messageCount && 
          cachedSummary.lastMessageId === lastMessageId) {
        console.log(`✅ Cache hit for opportunity ${opportunityId}`);
        return res.status(200).json({
          success: true,
          summary: cachedSummary.summary,
          conversationId,
          cached: true,
          cachedAt: cachedSummary.cachedAt
        });
      }
    }

    console.log(`🤖 Generating new summary for conversation ${conversationId}`);

    // Format conversation for Claude
    const conversationText = messages
      .map((msg) => {
        const author = msg.author?.type === 'admin' ? msg.author.name : 'Customer';
        const timestamp = new Date((msg.created_at || Date.now() / 1000) * 1000).toLocaleString();
        return `[${timestamp}] ${author}: ${msg.body || '(no text)'}`;
      })
      .join('\n\n');

    // Generate summary with Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      temperature: 0.3,
      system: `You are an expert customer support analyst. Analyze conversations and provide actionable insights for support agents.

Provide a concise, actionable summary in JSON format with these fields:
- mainIssue: One sentence describing the customer's main problem or question
- customerSentiment: "positive", "neutral", "negative", or "urgent"
- keyPoints: Array of 2-4 key points from the conversation
- suggestedActions: Array of 2-3 recommended next steps for the agent
- previousInteractions: Number (estimate based on conversation depth)
- estimatedResolutionTime: String like "5-10 min", "30 min", "1-2 hours"
- priority: "low", "medium", "high", or "urgent"

Be concise and actionable. Focus on what the agent needs to know RIGHT NOW.`,
      messages: [
        {
          role: 'user',
          content: `Analyze this customer support conversation:\n\n${conversationText}`
        }
      ]
    });

    // Extract JSON from Claude's response
    const content = message.content[0];
    let summary;
    
    if (content.type === 'text') {
      // Try to parse JSON from the text
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in Claude response');
      }
    } else {
      throw new Error('Unexpected response type from Claude');
    }

    // Cache the summary if we have an opportunityId
    if (opportunityId) {
      await cacheSummary(opportunityId, summary, messageCount, lastMessageId);
    }

    return res.status(200).json({
      success: true,
      summary,
      conversationId,
      cached: false
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    return res.status(500).json({
      error: 'Failed to generate summary',
      details: error.message
    });
  }
}

// Get cached summary from GHL custom field
async function getCachedSummary(opportunityId) {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/opportunities/${opportunityId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GHL_ACCESS_TOKEN}`,
          'Version': '2021-07-28',
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch opportunity: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // Look for the custom field with key 'opportunity.ai_summary_cache'
    const cacheField = data.opportunity?.customFields?.find(
      (field) => field.key === 'opportunity.ai_summary_cache'
    );

    if (!cacheField?.value) {
      console.log(`No cache found for opportunity ${opportunityId}`);
      return null;
    }

    const cachedData = JSON.parse(cacheField.value);
    console.log(`Found cached summary for opportunity ${opportunityId}`);
    return cachedData;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

// Store summary in GHL custom field
async function cacheSummary(opportunityId, summary, messageCount, lastMessageId) {
  try {
    const cacheData = {
      summary,
      messageCount,
      lastMessageId,
      cachedAt: new Date().toISOString()
    };

    const response = await fetch(
      `https://services.leadconnectorhq.com/opportunities/${opportunityId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${process.env.GHL_ACCESS_TOKEN}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customFields: [
            {
              key: 'opportunity.ai_summary_cache',
              value: JSON.stringify(cacheData)
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to cache summary: ${response.status} - ${errorText}`);
      throw new Error(`Failed to cache summary: ${response.status}`);
    }

    console.log(`✅ Cached summary for opportunity ${opportunityId}`);
  } catch (error) {
    console.error('Error caching summary:', error);
    // Don't throw - caching failure shouldn't break summary generation
  }
}