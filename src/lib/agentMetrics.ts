// src/lib/agentMetrics.ts
import type { Ticket } from "./types";

export interface AgentMetrics {
  agent: string;
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  closePercentage: number;
  avgCloseTime: string;
  escalated: number;
  escalationPercentage: number;
  resolved: number;
  deleted: number;
}

export function calculateAgentMetrics(tickets: Ticket[]): AgentMetrics[] {
  // Get unique agents
  const agents = Array.from(new Set(tickets.map(t => t.assignedTo).filter(Boolean))) as string[];
  
  return agents.map(agent => {
    const agentTickets = tickets.filter(t => t.assignedTo === agent);
    const total = agentTickets.length;
    
    const open = agentTickets.filter(t => t.status === "Open").length;
    const inProgress = agentTickets.filter(t => t.status === "In Progress").length;
    const closed = agentTickets.filter(t => t.status === "Closed").length;
    const escalated = agentTickets.filter(t => t.status === "Escalated to Dev").length;
    const resolved = agentTickets.filter(t => t.status === "Resolved").length;
    const deleted = agentTickets.filter(t => t.status === "Deleted").length;
    
    const closePercentage = total > 0 ? Math.round((closed / total) * 100) : 0;
    const escalationPercentage = total > 0 ? Math.round((escalated / total) * 100) : 0;
    
    // Calculate average closing time
    const closedTickets = agentTickets.filter(t => t.status === "Closed");
    let avgCloseTime = "N/A";
    
    if (closedTickets.length > 0) {
      const totalMs = closedTickets.reduce((acc, ticket) => {
        const created = new Date(ticket.createdAt).getTime();
        const updated = new Date(ticket.updatedAt).getTime();
        return acc + (updated - created);
      }, 0);
      
      const avgMs = totalMs / closedTickets.length;
      const avgHours = Math.round(avgMs / (1000 * 60 * 60));
      
      if (avgHours < 24) {
        avgCloseTime = `${avgHours}h`;
      } else {
        const avgDays = (avgHours / 24).toFixed(1);
        avgCloseTime = `${avgDays}d`;
      }
    }
    
    return {
      agent,
      total,
      open,
      inProgress,
      closed,
      closePercentage,
      avgCloseTime,
      escalated,
      escalationPercentage,
      resolved,
      deleted,
    };
  }).sort((a, b) => b.total - a.total); // Sort by total tickets descending
}

export function getTopPerformers(metrics: AgentMetrics[]) {
  if (metrics.length === 0) return null;
  
  const withClosedTickets = metrics.filter(m => m.closed > 0);
  
  const highestCloseRate = [...metrics].sort((a, b) => b.closePercentage - a.closePercentage)[0];
  const lowestEscalation = [...metrics].sort((a, b) => a.escalationPercentage - b.escalationPercentage)[0];
  
  // For fastest time, need to parse the time string
  let fastestAgent = null;
  if (withClosedTickets.length > 0) {
    fastestAgent = withClosedTickets.reduce((fastest, current) => {
      const parseTime = (time: string) => {
        if (time === "N/A") return Infinity;
        if (time.endsWith('h')) return parseFloat(time);
        if (time.endsWith('d')) return parseFloat(time) * 24;
        return Infinity;
      };
      
      const currentTime = parseTime(current.avgCloseTime);
      const fastestTime = parseTime(fastest.avgCloseTime);
      
      return currentTime < fastestTime ? current : fastest;
    });
  }
  
  return {
    highestCloseRate,
    fastestAvgTime: fastestAgent,
    lowestEscalation,
  };
}