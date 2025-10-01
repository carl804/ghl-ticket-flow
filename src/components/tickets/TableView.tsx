import React from "react";
import type { Ticket } from "@/lib/types";

export interface TableViewProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

export function TableView({ tickets, onTicketClick }: TableViewProps) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-gray-100 text-left">
          <th className="p-2 border">ID</th>
          <th className="p-2 border">Name</th>
          <th className="p-2 border">Status</th>
          <th className="p-2 border">Priority</th>
          <th className="p-2 border">Category</th>
          <th className="p-2 border">Assigned To</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map((ticket) => (
          <tr
            key={ticket.id}
            className="hover:bg-gray-50 cursor-pointer"
            onClick={() => onTicketClick(ticket)}
          >
            <td className="p-2 border">{ticket.id}</td>
            <td className="p-2 border">{ticket.name}</td>
            <td className="p-2 border">{ticket.status}</td>
            <td className="p-2 border">{ticket.priority}</td>
            <td className="p-2 border">{ticket.category}</td>
            <td className="p-2 border">{ticket.assignedTo || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
