// src/lib/googleSheets.ts
import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS || '';

// Initialize Google Sheets client
function getGoogleSheetsClient() {
  if (!CREDENTIALS || !SHEET_ID) {
    console.error('Missing Google Sheets credentials or Sheet ID');
    return null;
  }

  try {
    const credentials = JSON.parse(CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Failed to initialize Google Sheets client:', error);
    return null;
  }
}

// Sheet names
const SHEETS = {
  AGENT_PERFORMANCE: 'Agent Performance',
  STAGE_TRANSITIONS: 'Stage Transitions',
  TICKET_SNAPSHOTS: 'Ticket Snapshots',
  DAILY_METRICS: 'Daily Metrics',
};

// Log stage transition to Google Sheets
export async function logStageTransition(data: {
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
}) {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return;

  try {
    const timestamp = new Date().toISOString();
    const values = [[
      timestamp,
      data.ticketId,
      data.ticketName,
      data.agent,
      data.contactName,
      data.category,
      data.priority,
      data.fromStage,
      data.toStage,
      data.durationInPreviousStage,
      data.totalTicketAge,
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEETS.STAGE_TRANSITIONS}!A:K`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    console.log('✅ Stage transition logged to Google Sheets');
  } catch (error) {
    console.error('❌ Failed to log stage transition:', error);
  }
}

// Export agent performance snapshot
export async function exportAgentPerformance(metrics: Array<{
  agent: string;
  total: number;
  open: number;
  inProgress: number;
  escalated: number;
  resolved: number;
  closed: number;
  closePercentage: number;
  avgCloseTime: string;
  avgTimeInCurrentStage: string;
  escalationPercentage: number;
}>) {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return;

  try {
    const timestamp = new Date().toISOString();
    const values = metrics.map(m => [
      timestamp,
      m.agent,
      m.total,
      m.open,
      m.inProgress,
      m.escalated,
      m.resolved,
      m.closed,
      m.closePercentage,
      m.avgCloseTime,
      m.avgTimeInCurrentStage,
      m.escalationPercentage,
      m.total - m.closed,
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEETS.AGENT_PERFORMANCE}!A:M`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    console.log('✅ Agent performance exported to Google Sheets');
  } catch (error) {
    console.error('❌ Failed to export agent performance:', error);
  }
}

// Export ticket snapshot
export async function exportTicketSnapshot(tickets: any[]) {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return;

  try {
    const now = new Date();
    const exportDate = now.toISOString().split('T')[0];

    const values = tickets.map(ticket => {
      const createdDate = new Date(ticket.createdAt);
      const updatedDate = new Date(ticket.updatedAt);
      const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceUpdate = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));

      return [
        exportDate,
        ticket.id,
        ticket.name,
        ticket.assignedTo || 'Unassigned',
        ticket.contact?.name || '',
        ticket.contact?.email || '',
        ticket.contact?.phone || '',
        ticket.category,
        ticket.priority,
        ticket.status,
        daysSinceCreated,
        daysSinceUpdate,
        ticket.agencyName || '',
        ticket.description || '',
      ];
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEETS.TICKET_SNAPSHOTS}!A:N`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    console.log('✅ Ticket snapshot exported to Google Sheets');
  } catch (error) {
    console.error('❌ Failed to export ticket snapshot:', error);
  }
}

// Export daily metrics
export async function exportDailyMetrics(tickets: any[]) {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const date = now.toISOString().split('T')[0];

    const newToday = tickets.filter(t => new Date(t.createdAt) >= todayStart).length;
    const closedToday = tickets.filter(t => 
      t.status === 'Closed' && new Date(t.updatedAt) >= todayStart
    ).length;
    const resolvedToday = tickets.filter(t => 
      t.status === 'Resolved' && new Date(t.updatedAt) >= todayStart
    ).length;
    const escalatedToday = tickets.filter(t => 
      t.status === 'Escalated to Dev' && new Date(t.updatedAt) >= todayStart
    ).length;

    const completedTickets = tickets.filter(t => 
      t.status === 'Resolved' || t.status === 'Closed'
    );
    let avgResolutionTime = 'N/A';
    if (completedTickets.length > 0) {
      const totalMs = completedTickets.reduce((acc, t) => {
        const created = new Date(t.createdAt).getTime();
        const updated = new Date(t.updatedAt).getTime();
        return acc + (updated - created);
      }, 0);
      const avgMs = totalMs / completedTickets.length;
      const avgHours = Math.round(avgMs / (1000 * 60 * 60));
      avgResolutionTime = avgHours < 24 ? `${avgHours}h` : `${(avgHours / 24).toFixed(1)}d`;
    }

    const values = [[
      date,
      tickets.length,
      newToday,
      closedToday,
      resolvedToday,
      escalatedToday,
      avgResolutionTime,
      tickets.filter(t => t.status === 'Open').length,
      tickets.filter(t => t.status === 'In Progress').length,
      tickets.filter(t => t.status === 'Escalated to Dev').length,
      tickets.filter(t => t.status !== 'Closed' && t.status !== 'Deleted').length,
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEETS.DAILY_METRICS}!A:K`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    console.log('✅ Daily metrics exported to Google Sheets');
  } catch (error) {
    console.error('❌ Failed to export daily metrics:', error);
  }
}