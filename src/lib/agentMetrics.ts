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
  avgTimeInCurrentStage: string;
}

export function calculateAgentMetrics(tickets: Ticket[]): AgentMetrics[] {
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
    
    // Calculate average closing time (for Closed or Resolved tickets)
    const completedTickets = agentTickets.filter(t => t.status === "Closed" || t.status === "Resolved");
    let avgCloseTime = "N/A";
    
    if (completedTickets.length > 0) {
      const totalMs = completedTickets.reduce((acc, ticket) => {
        const created = new Date(ticket.createdAt).getTime();
        const updated = new Date(ticket.updatedAt).getTime();
        return acc + (updated - created);
      }, 0);
      
      const avgMs = totalMs / completedTickets.length;
      const avgHours = Math.round(avgMs / (1000 * 60 * 60));
      
      if (avgHours < 24) {
        avgCloseTime = `${avgHours}h`;
      } else {
        const avgDays = (avgHours / 24).toFixed(1);
        avgCloseTime = `${avgDays}d`;
      }
    }
    
    // Calculate average time in current stage for active tickets
    const activeTickets = agentTickets.filter(t => 
      t.status !== "Closed" && t.status !== "Deleted"
    );
    
    let avgTimeInCurrentStage = "N/A";
    if (activeTickets.length > 0) {
      const now = new Date().getTime();
      const totalMs = activeTickets.reduce((acc, ticket) => {
        const updated = new Date(ticket.updatedAt).getTime();
        return acc + (now - updated);
      }, 0);
      
      const avgMs = totalMs / activeTickets.length;
      const avgHours = Math.round(avgMs / (1000 * 60 * 60));
      
      if (avgHours < 1) {
        avgTimeInCurrentStage = "< 1h";
      } else if (avgHours < 24) {
        avgTimeInCurrentStage = `${avgHours}h`;
      } else {
        const avgDays = (avgHours / 24).toFixed(1);
        avgTimeInCurrentStage = `${avgDays}d`;
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
      avgTimeInCurrentStage,
    };
  }).sort((a, b) => b.total - a.total);
}

export function getTopPerformers(metrics: AgentMetrics[]) {
  if (metrics.length === 0) return null;
  
  const withClosedTickets = metrics.filter(m => m.closed > 0);
  
  const highestCloseRate = [...metrics].sort((a, b) => b.closePercentage - a.closePercentage)[0];
  const lowestEscalation = [...metrics].sort((a, b) => a.escalationPercentage - b.escalationPercentage)[0];
  
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