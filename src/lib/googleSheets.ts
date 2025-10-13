interface StageTransitionData {
  ticketId: string;
  ticketName: string;
  agent: string;
  contactName: string;
  category: string;
  priority: string;
  fromStage: string;
  toStage: string;
  durationInPreviousStage: string;
  totalTicketAge: string;
}

/**
 * Log a stage transition to Google Sheets via serverless API
 */
export async function logStageTransition(data: StageTransitionData): Promise<void> {
  try {
    const response = await fetch('/api/log-transition', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to log transition');
    }

    console.log('✅ Stage transition logged to Google Sheets');
  } catch (error) {
    console.error('❌ Failed to log stage transition:', error);
    // Don't throw - we don't want to break the UI if logging fails
  }
}