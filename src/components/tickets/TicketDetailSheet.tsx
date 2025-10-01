import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from "@/lib/types";

export interface TicketDetailSheetProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailSheet({ ticket, open, onOpenChange }: TicketDetailSheetProps) {
  const [editedTicket, setEditedTicket] = useState<Ticket>(ticket);

  const handleSave = () => {
    // Hook this into your HighLevel API update later
    console.log("Saving ticket:", editedTicket);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle>Ticket Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="ticket-name">Ticket ID</Label>
            <Input id="ticket-name" value={editedTicket.name} disabled />
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={editedTicket.status}
              onValueChange={(v: TicketStatus) =>
                setEditedTicket({ ...editedTicket, status: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {(["Open", "In Progress", "Pending Customer", "Resolved"] as TicketStatus[]).map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Priority</Label>
            <Select
              value={editedTicket.priority}
              onValueChange={(v: TicketPriority) =>
                setEditedTicket({ ...editedTicket, priority: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {(["Low", "Medium", "High", "Urgent"] as TicketPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Category</Label>
            <Select
              value={editedTicket.category}
              onValueChange={(v: TicketCategory) =>
                setEditedTicket({ ...editedTicket, category: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {([
                  "BILLING",
                  "TECHNICAL SUPPORT",
                  "ONBOARDING",
                  "SALES INQUIRY",
                  "REPORT AN OUTAGE",
                  "GENERAL QUESTIONS",
                  "CANCEL ACCOUNT",
                  "UPGRADE PLAN",
                ] as TicketCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Resolution Summary</Label>
            <Input
              value={editedTicket.resolutionSummary || ""}
              onChange={(e) =>
                setEditedTicket({ ...editedTicket, resolutionSummary: e.target.value })
              }
              placeholder="Add summary..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
