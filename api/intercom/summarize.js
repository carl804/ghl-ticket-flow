import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory cache for summaries (you could use Redis/database for persistence)
const summaryCache = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId, messages, forceRegenerate = false } = req.body;

    if (!conversationId || !messages || messages.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create a hash of the conversation content to detect changes
    const conversationHash = generateConversationHash(messages);
    const cacheKey = `summary_${conversationId}`;
    
    // Check if we have a cached summary for this exact conversation state
    if (!forceRegenerate && summaryCache.has(cacheKey)) {
      const cachedData = summaryCache.get(cacheKey);
      
      // If the conversation hasn't changed, return cached summary
      if (cachedData.hash === conversationHash) {
        console.log(`📋 Returning cached summary for conversation ${conversationId}`);
        return res.status(200).json({ 
          success: true, 
          summary: cachedData.summary,
          conversationId,
          cached: true,
          cachedAt: cachedData.timestamp
        });
      }
    }

    console.log(`🤖 Generating new AI summary for conversation ${conversationId}`);

    // Format messages for AI analysis
    const conversationText = messages.map((msg) => {
      const role = msg.author.type === 'user' || msg.author.type === 'lead' ? 'Customer' : 'Agent';
      const name = msg.author.name || 'Unknown';
      const body = msg.body?.replace(/<[^>]*>/g, '') || ''; // Strip HTML
      const timestamp = new Date(msg.created_at * 1000).toLocaleString();
      return `${timestamp} - ${role} (${name}): ${body}`;
    }).join('\n\n');

    // Call OpenAI for summary
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant analyzing customer support conversations. Provide a concise, actionable summary in JSON format with these fields:
- mainIssue: One sentence describing the customer's main problem or question
- customerSentiment: "positive", "neutral", "negative", or "urgent"
- keyPoints: Array of 2-4 key points from the conversation
- suggestedActions: Array of 2-3 recommended next steps for the agent
- previousInteractions: Number (estimate based on conversation depth)
- estimatedResolutionTime: String like "5-10 min", "30 min", "1-2 hours"
- priority: "low", "medium", "high", or "urgent"
- ticketStatus: "new", "in_progress", "waiting_customer", "resolved" (based on conversation state)

Be concise and actionable. Focus on what the agent needs to know RIGHT NOW.`
        },
        {
          role: 'user',
          content: `Analyze this customer support conversation:\n\n${conversationText}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 600,
    });

    const summaryText = completion.choices[0].message.content;
    const summary = JSON.parse(summaryText || '{}');

    // Cache the result with the conversation hash
    summaryCache.set(cacheKey, {
      summary,
      hash: conversationHash,
      timestamp: new Date().toISOString(),
      messageCount: messages.length
    });

    console.log(`✅ Generated and cached summary for conversation ${conversationId}`);

    return res.status(200).json({ 
      success: true, 
      summary,
      conversationId,
      cached: false,
      messageCount: messages.length
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    return res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error.message 
    });
  }
}

// Generate a hash of the conversation content to detect changes
function generateConversationHash(messages) {
  const contentString = messages.map(msg => 
    `${msg.author.id}_${msg.created_at}_${msg.body || ''}`
  ).join('|');
  
  // Simple hash function (you could use crypto.createHash for better hashing)
  let hash = 0;
  for (let i = 0; i < contentString.length; i++) {
    const char = contentString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

// Optional: Clean up old cache entries (call this periodically)
export function cleanupCache() {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  
  for (const [key, value] of summaryCache.entries()) {
    if (new Date(value.timestamp).getTime() < oneHourAgo) {
      summaryCache.delete(key);
    }
  }
  
  console.log(`🧹 Cache cleanup: ${summaryCache.size} summaries remaining`);
}