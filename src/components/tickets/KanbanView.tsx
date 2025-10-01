import React from "react";
import type { Ticket, TicketStatus } from "@/lib/types";

interface KanbanViewProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

const columns: Record<TicketStatus, string> = {
  Open: "Open",
  "In Progress": "In Progress",
  "Pending Customer": "Pending Customer",
  Resolved: "Resolved",
  Closed: "Closed", // ✅ added missing key
};

export default function KanbanView({ tickets, onTicketClick }: KanbanViewProps) {
  return (
    <div className="grid grid-cols-5 gap-4">
      {Object.entries(columns).map(([status, label]) => (
        <div key={status} className="bg-gray-100 rounded p-2">
          <h3 className="font-semibold mb-2">{label}</h3>
          {tickets
            .filter((t) => t.status === status)
            .map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white p-2 mb-2 rounded shadow cursor-pointer"
                onClick={() => onTicketClick(ticket)}
              >
                <p className="text-sm font-medium">{ticket.name}</p>
                <p className="text-xs text-gray-500">{ticket.category}</p>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
