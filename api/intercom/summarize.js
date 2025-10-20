import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId, messages } = req.body;

    if (!conversationId || !messages || messages.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Format messages for AI analysis
    const conversationText = messages.map((msg) => {
      const role = msg.author.type === 'user' || msg.author.type === 'lead' ? 'Customer' : 'Agent';
      const name = msg.author.name || 'Unknown';
      const body = msg.body?.replace(/<[^>]*>/g, '') || ''; // Strip HTML
      return `${role} (${name}): ${body}`;
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

Be concise and actionable. Focus on what the agent needs to know RIGHT NOW.`
        },
        {
          role: 'user',
          content: `Analyze this customer support conversation:\n\n${conversationText}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 500,
    });

    const summaryText = completion.choices[0].message.content;
    const summary = JSON.parse(summaryText || '{}');

    return res.status(200).json({ 
      success: true, 
      summary,
      conversationId 
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    return res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error.message 
    });
  }
}