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
import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  GHLUser,
} from "@/lib/types";
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

// Config
const CATEGORIES: TicketCategory[] = [
  "Billing",
  "Tech",
  "Sales",
  "Onboarding",
  "Outage",
  "General",
];

interface TicketDetailSheetProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailSheet({ ticket, open, onOpenChange }: TicketDetailSheetProps) {
  const queryClient = useQueryClient();
  const [editedTicket, setEditedTicket] = useState<Partial<Ticket>>({});
  const [newTag, setNewTag] = useState("");

  const { data: users = [] } = useQuery<GHLUser[]>({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  useEffect(() => {
    if (ticket) {
      setEditedTicket(ticket);
    }
  }, [ticket]);

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Ticket>) => updateTicket(ticket!.id, updates),
    onSuccess: () => {
      toast.success("Ticket updated successfully");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => {
      toast.error("Failed to update ticket");
    },
  });

  const handleSave = () => {
    const updates: Partial<Ticket> = { ...editedTicket };
    if (updates.assignedToUserId) {
      const selectedUser = users.find((u) => u.id === updates.assignedToUserId);
      if (selectedUser) {
        updates.assignedTo = selectedUser.name;
      }
    }
    updateMutation.mutate(updates);
  };

  const handleViewConversations = () => {
    if (ticket?.contactId) {
      const ghlUrl = `https://app.gohighlevel.com/v2/location/${
        import.meta.env.VITE_GHL_LOCATION_ID || "YOUR_LOCATION_ID"
      }/conversations/all/${ticket.contactId}`;
      window.open(ghlUrl, "_blank");
    } else {
      toast.error("Contact ID not available");
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      const currentTags = editedTicket.tags || [];
      setEditedTicket({
        ...editedTicket,
        tags: [...currentTags, newTag.trim()],
      });
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
          {/* --- Status, Priority, Category --- */}
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
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Pending Customer">Pending Customer</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
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
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
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
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* --- Contact Information --- */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="grid gap-4">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Name:</span>
                <span>{ticket.contact.name}</span>
              </div>
              {ticket.contact.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <a href={`mailto:${ticket.contact.email}`} className="text-primary hover:underline">
                    {ticket.contact.email}
                  </a>
                </div>
              )}
              {ticket.contact.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Phone:</span>
                  <a href={`tel:${ticket.contact.phone}`} className="text-primary hover:underline">
                    {ticket.contact.phone}
                  </a>
                </div>
              )}
              {ticket.agencyName && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Agency:</span>
                  <span>{ticket.agencyName}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* --- Assigned To --- */}
          <div className="space-y-2">
            <Label>Assigned To</Label>
            <Select
              value={editedTicket.assignedToUserId}
              onValueChange={(value) =>
                setEditedTicket({ ...editedTicket, assignedToUserId: value })
              }
            >
              <SelectTrigger className="bg-popover">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* --- Description --- */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={editedTicket.description || ""}
              onChange={(e) =>
                setEditedTicket({ ...editedTicket, description: e.target.value })
              }
              placeholder="Enter ticket description"
              rows={4}
              className="bg-popover"
            />
          </div>

          {/* --- Resolution Summary --- */}
          <div className="space-y-2">
            <Label>Resolution Summary</Label>
            <Textarea
              value={editedTicket.resolutionSummary || ""}
              onChange={(e) =>
                setEditedTicket({ ...editedTicket, resolutionSummary: e.target.value })
              }
              placeholder="Enter resolution summary"
              rows={3}
              className="bg-popover"
            />
          </div>

          {/* --- Tags --- */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag"
                className="bg-popover"
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(editedTicket.tags || []).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="pr-1 cursor-pointer hover:bg-secondary/80"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* --- Metadata --- */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span>{format(new Date(ticket.createdAt), "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Updated:</span>
              <span>{format(new Date(ticket.updatedAt), "MMM d, yyyy")}</span>
            </div>
          </div>

          {/* --- Conversations Button --- */}
          <Button
            variant="outline"
            onClick={handleViewConversations}
            className="w-full"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            View Conversations
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>

          <Separator />

          {/* --- Action Buttons --- */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex-1"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
