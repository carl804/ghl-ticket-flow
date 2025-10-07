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
                  {(["Open", "In Progress", "Resolved", "Closed", "Deleted"] as TicketStatus[]).map(
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
                      {cat.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{ticket.contact.name || "N/A"}</p>
              </div>
              {ticket.contact.email && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <p className="font-medium truncate">{ticket.contact.email}</p>
                </div>
              )}
              {ticket.contact.phone && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </Label>
                  <p className="font-medium">{ticket.contact.phone}</p>
                </div>
              )}
              {ticket.agencyName && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Agency
                  </Label>
                  <p className="font-medium">{ticket.agencyName}</p>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewConversations}
              className="w-full"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              View Conversations
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>

          <Separator />

          {/* Assigned To */}
          <div>
            <Label>Assigned To</Label>
            <Select
              value={editedTicket.assignedToUserId || ""}
              onValueChange={(value) =>
                setEditedTicket({ ...editedTicket, assignedToUserId: value })
              }
            >
              <SelectTrigger className="mt-1 bg-popover">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="">Unassigned</SelectItem>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={editedTicket.description || ""}
              onChange={(e) =>
                setEditedTicket({ ...editedTicket, description: e.target.value })
              }
              rows={4}
              className="mt-1 bg-popover"
              placeholder="Ticket description..."
            />
          </div>

          {/* Resolution Summary */}
          <div>
            <Label>Resolution Summary</Label>
            <Textarea
              value={editedTicket.resolutionSummary || ""}
              onChange={(e) =>
                setEditedTicket({ ...editedTicket, resolutionSummary: e.target.value })
              }
              rows={4}
              className="mt-1 bg-popover"
              placeholder="How was this resolved..."
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(editedTicket.tags || []).map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                className="bg-popover"
              />
              <Button onClick={handleAddTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <div>
                <p className="text-xs">Created</p>
                <p className="font-medium text-foreground">
                  {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <div>
                <p className="text-xs">Updated</p>
                <p className="font-medium text-foreground">
                  {format(new Date(ticket.updatedAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-popover border-t pt-4 flex gap-2">
          <Button onClick={onOpenChange} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default TicketDetailSheet;