import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { updateTicket, fetchUsers, fetchTags, updateContactTags, ghlRequest, type GHLTag } from "@/lib/api";
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
  Search,
  Check,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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
  const [tagSearch, setTagSearch] = useState("");
  const [tagsOpen, setTagsOpen] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const { data: availableTags = [] as GHLTag[] } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

  useEffect(() => {
    if (ticket) {
      console.log('Ticket loaded in sheet:', ticket);
      console.log('Ticket tags:', ticket.tags);
      setEditedTicket(ticket);
      console.log("✅ editedTicket set to:", ticket);
    }
  }, [ticket]);

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Ticket>) => updateTicket(ticket!.id, updates),
    onSuccess: () => {
      toast.success("Ticket updated successfully");
      queryClient.invalidateQueries({ queryKey: ["tickets"] as const });
    },
    onError: () => toast.error("Failed to update ticket"),
  });

  const handleSave = async () => {
    const updates: Partial<Ticket> = { ...editedTicket };
    if (updates.assignedToUserId) {
      const selectedUser = users.find(u => u.id === updates.assignedToUserId);
      if (selectedUser) updates.assignedTo = selectedUser.name;
    }
    
    // Update contact tags separately if they changed
    if (ticket?.contactId && updates.tags) {
      try {
        await updateContactTags(ticket.contactId, updates.tags);
      } catch (error) {
        toast.error("Failed to update tags");
        // Continue even if tags fail
      }
    }
    
    updateMutation.mutate(updates);
  };

  const handleViewConversations = async () => {
    if (!ticket?.contactId) {
      toast.error("Contact ID not available");
      return;
    }
    
    try {
      const tokens = JSON.parse(localStorage.getItem("ghl_tokens") || "{}");
      const locationId = tokens.locationId;
      
      const ghlUrl = `https://app.gohighlevel.com/v2/location/${locationId}/contacts/detail/${ticket.contactId}`;
      window.open(ghlUrl, "_blank");
    } catch (error) {
      toast.error("Failed to open contact");
      console.error(error);
    }
  };

  const handleToggleTag = (tagName: string) => {
    const currentTags = editedTicket.tags || [];
    if (currentTags.includes(tagName)) {
      setEditedTicket({
        ...editedTicket,
        tags: currentTags.filter((tag) => tag !== tagName),
      });
    } else {
      setEditedTicket({
        ...editedTicket,
        tags: [...currentTags, tagName],
      });
    }
  };

  const handleRemoveTag = (tagName: string) => {
    const currentTags = editedTicket.tags || [];
    setEditedTicket({
      ...editedTicket,
      tags: currentTags.filter((tag) => tag !== tagName),
    });
  };

  const filteredAvailableTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

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
            {/* Opportunity Status */}
            <div className="flex-1 min-w-[150px]">
              <Label>Status</Label>
              <Select
                value={editedTicket.opportunityStatus || "open"}
                onValueChange={(value) =>
                  setEditedTicket({ ...editedTicket, opportunityStatus: value as any })
                }
              >
                <SelectTrigger className="mt-1 bg-popover">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
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
              View Contact in GHL
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>

          <Separator />

          {/* Ticket Owner */}
          <div>
            <Label>Ticket Owner</Label>
            <Select
              value={editedTicket.assignedTo || "unassigned"}
              onValueChange={(value) =>
                setEditedTicket({ ...editedTicket, assignedTo: value === "unassigned" ? "" : value })
              }
            >
              <SelectTrigger className="mt-1 bg-popover">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.name}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ticket Name */}
          <div>
            <Label>Ticket Name</Label>
            <Input
              value={editedTicket.name || ""}
              onChange={(e) =>
                setEditedTicket({ ...editedTicket, name: e.target.value })
              }
              className="mt-1 bg-popover"
              placeholder="Ticket name..."
            />
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
            
            {/* Selected Tags */}
            <div className="flex flex-wrap gap-2 mt-2 mb-3 min-h-[36px] p-2 border rounded-md bg-background">
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
              {(editedTicket.tags || []).length === 0 && (
                <span className="text-sm text-muted-foreground">No tags assigned</span>
              )}
            </div>

            {/* Add Tags Popover */}
            <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tags
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search / create tags"
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                  {filteredAvailableTags.length > 0 ? (
                    <div className="space-y-1">
                      {filteredAvailableTags.map((tag) => {
                        const isSelected = (editedTicket.tags || []).includes(tag.name);
                        return (
                          <div
                            key={tag.id}
                            className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                            onClick={() => handleToggleTag(tag.name)}
                          >
                            <div className="flex-1">{tag.name}</div>
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No tags found
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(ticket.createdAt), "MMM d, yyyy, h:mm a")}
                </p>
                <p className="text-xs text-muted-foreground">
                  ({formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })})
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Updated</p>
                <p className="font-medium">
                  {format(new Date(ticket.updatedAt), "MMM d, yyyy, h:mm a")}
                </p>
                <p className="text-xs text-muted-foreground">
                  ({formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })})
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-popover border-t pt-4 flex gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
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