import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { updateTicket, fetchUsers } from "@/lib/api";
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from "@/lib/types";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  X,
  Plus,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

// ✅ Proper casing (matches types.ts)
const CATEGORIES: TicketCategory[] = [
  "Billing",
  "Technical Support",
  "Onboarding",
  "Sales Inquiry",
  "Report an Outage",
  "General Questions",
  "Cancel Account",
  "Upgrade Plan",
];

interface TicketDetailSheetProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TicketDetailSheet({ ticket, open, onOpenChange }: TicketDetailSheetProps) {
  const queryClient = useQueryClient();
  const [editedTicket, setEditedTicket] = useState<Partial<Ticket>>({});
  const [newTag, setNewTag] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  useEffect(() => {
    if (ticket) setEditedTicket(ticket);
  }, [ticket]);

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Ticket>) => updateTicket(ticket!.id, updates),
    onSuccess: () => {
      toast.success("Ticket updated successfully");
     queryClient.invalidateQueries({ queryKey: ["tickets"] as const });
    },
    onError: () => toast.error("Failed to update ticket"),
  });

  const handleSave = () => {
    const updates: Partial<Ticket> = { ...editedTicket };
    if (updates.assignedToUserId) {
      const selectedUser = users.find(u => u.id === updates.assignedToUserId);
      if (selectedUser) updates.assignedTo = selectedUser.name;
    }
    updateMutation.mutate(updates);
  };

  const handleViewConversations = () => {
    if (ticket?.contactId) {
      const ghlUrl = `https://app.gohighlevel.com/v2/location/${import.meta.env.VITE_GHL_LOCATION_ID || "YOUR_LOCATION_ID"}/conversations/all/${ticket.contactId}`;
      window.open(ghlUrl, "_blank");
    } else toast.error("Contact ID not available");
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      const currentTags = editedTicket.tags || [];
      setEditedTicket({ ...editedTicket, tags: [...currentTags, newTag.trim()] });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTicket({
      ...editedTicket,
      tags: (editedTicket.tags || []).filter((tag) => tag !== tagToRemove),
    });
  };

  if (!ticket) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-popover">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold">{ticket.name}</SheetTitle>
          <SheetDescription>View and edit ticket details</SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Status / Priority / Category */}
          <div className="flex flex-wrap gap-3">
            {/* Status */}
            <div className="flex-1 min-w-[150px]">
              <Label>Status</Label>
              <Select
                value={editedTicket.status}
                onValueChange={(value) =>
                  setEditedTicket({ ...editedTicket, status: value as TicketStatus })
                }
              >
                <SelectTrigger className="mt-1 bg-popover">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  {(["Open", "In Progress", "Pending Customer", "Resolved"] as TicketStatus[]).map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="flex-1 min-w-[150px]">
              <Label>Priority</Label>
              <Select
                value={editedTicket.priority}
                onValueChange={(value) =>
                  setEditedTicket({ ...editedTicket, priority: value as TicketPriority })
                }
              >
                <SelectTrigger className="mt-1 bg-popover">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  {(["Low", "Medium", "High", "Urgent"] as TicketPriority[]).map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="flex-1 min-w-[150px]">
              <Label>Category</Label>
              <Select
                value={editedTicket.category}
                onValueChange={(value) =>
                  setEditedTicket({ ...editedTicket, category: value as TicketCategory })
                }
              >
                <SelectTrigger className="mt-1 bg-popover">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {/* ✅ Uppercase for display, but value stays type-safe */}
                      {cat.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* ...rest of your code unchanged (contact info, assignee, description, tags, etc.) ... */}

        </div>
      </SheetContent>
    </Sheet>
  );
}

export default TicketDetailSheet;
