import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchTickets, updateTicket } from "@/lib/api-fixed";
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from "@/lib/types";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Tag,
  Edit2,
  Save,
  MessageSquare,
  Bell,
  Menu,
} from "lucide-react";
import { format } from "date-fns";
import InboxSidebar from "@/components/intercom/InboxSidebar";
import IntercomChatView from "@/components/intercom/IntercomChatView";
import ConversationSummary from "@/components/intercom/ConversationSummary";
import TicketDetailsSidebar from "@/components/intercom/TicketDetailsSidebar";

const priorityConfig = {
  Low: { color: "bg-priority-low/10 text-priority-low border-priority-low/20" },
  Medium: { color: "bg-priority-medium/10 text-priority-medium border-priority-medium/20" },
  High: { color: "bg-priority-high/10 text-priority-high border-priority-high/20" },
  Urgent: { color: "bg-priority-urgent/10 text-priority-urgent border-priority-urgent/20" },
};

const statusConfig: Record<TicketStatus, { color: string }> = {
  Open: { color: "bg-status-open text-white" },
  "In Progress": { color: "bg-status-in-progress text-white" },
  "Pending Customer": { color: "bg-status-pending text-white" },
  Resolved: { color: "bg-status-resolved text-white" },
  Closed: { color: "bg-gray-500 text-white" },
  Deleted: { color: "bg-gray-500 text-white" },
  "Escalated to Dev": { color: "bg-red-600 text-white" },
};

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTicket, setEditedTicket] = useState<Partial<Ticket>>({});
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });

  const ticket = tickets.find((t) => t.id === id);

  useEffect(() => {
    if (ticket) {
      setEditedTicket(ticket);
    }
  }, [ticket]);

  // Fetch unread count for notification bell
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/intercom/conversation');
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch conversation messages for Intercom tickets
  useEffect(() => {
    if (ticket?.intercomConversationId) {
      fetchConversationMessages(ticket.intercomConversationId);
    }
  }, [ticket?.intercomConversationId]);

  const fetchConversationMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/intercom/conversation?conversationId=${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        const conversation = data.conversation;
        
        // Format messages for AI summary
        const conversationParts = conversation.conversation_parts?.conversation_parts || [];
        const allMessages = [
          {
            type: 'message',
            author: conversation.source.author,
            body: conversation.source.body,
            created_at: conversation.created_at,
          },
          ...conversationParts.map((part: any) => ({
            type: part.part_type,
            author: part.author,
            body: part.body,
            created_at: part.created_at,
            attachments: part.attachments,
          })),
        ];
        
        setConversationMessages(allMessages);
      }
    } catch (error) {
      console.error('Failed to fetch conversation messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Fetch contact data
  const { data: contact } = useQuery({
    queryKey: ['contact', ticket?.contact?.id],
    queryFn: async () => {
      if (!ticket?.contact?.id) return null;
      const response = await fetch(`/api/ghl/contacts/${ticket.contact.id}`);
      if (!response.ok) throw new Error('Failed to fetch contact');
      return response.json();
    },
    enabled: !!ticket?.contact?.id,
  });

  // Fetch conversation data for sidebar
  const { data: conversation } = useQuery({
    queryKey: ['intercom-conversation', ticket?.intercomConversationId],
    queryFn: async () => {
      if (!ticket?.intercomConversationId) return null;
      const response = await fetch(`/api/intercom/conversation?conversationId=${ticket.intercomConversationId}`);
      if (!response.ok) throw new Error('Failed to fetch conversation');
      const data = await response.json();
      return data.conversation;
    },
    enabled: !!ticket?.intercomConversationId,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Ticket>) => updateTicket(id!, updates),
    onSuccess: () => {
      toast.success("Ticket updated successfully");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => {
      toast.error("Failed to update ticket");
    },
  });

  const handleSave = () => {
    updateMutation.mutate(editedTicket);
  };

  const handleAssignmentChange = (assignee: string) => {
    // Update the ticket assignee in GHL
    updateMutation.mutate({ assignedTo: assignee });
  };

  if (!ticket) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Ticket not found</p>
            <Button onClick={() => navigate("/tickets")}>Back to Tickets</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if this is an Intercom ticket
  const isIntercomTicket = ticket.ticketSource === 'Intercom' || ticket.name?.includes('[Intercom]');
  const intercomConversationId = ticket.intercomConversationId;

  // NEW: For Intercom tickets with 3-column layout
  if (isIntercomTicket && intercomConversationId) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="h-14 border-b bg-white dark:bg-gray-950 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/tickets")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Tickets
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className="lg:hidden"
            >
              <Menu className="w-4 h-4" />
            </Button>

            {/* Ticket Title Only */}
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold truncate max-w-md">{ticket.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit/Save buttons */}
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}

            {/* Notification Bell */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* 3 Column Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Sidebar - Real-time Inbox */}
          {showLeftSidebar && (
            <InboxSidebar
              currentConversationId={intercomConversationId}
              onConversationSelect={(conversationId) => {
                // Find the ticket with this conversation ID and navigate to it
                const targetTicket = tickets.find(t => t.intercomConversationId === conversationId);
                if (targetTicket) {
                  navigate(`/tickets/${targetTicket.id}`);
                } else {
                  console.log('Ticket not found for conversation:', conversationId);
                }
              }}
            />
          )}

          {/* Center - Conversation */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
            <IntercomChatView
              conversationId={intercomConversationId}
              ticketId={ticket.id}
              intercomTicketOwner={ticket.intercomAgent || ticket.assignedTo}
              priority={ticket.priority}
              category={ticket.category}
              opportunityId={ticket.id}
              onAssignmentChange={handleAssignmentChange}
            />
          </div>

          {/* Right Sidebar - Details */}
          <TicketDetailsSidebar
            ticketId={ticket.id}
            conversationId={intercomConversationId}
            opportunity={ticket}
            conversation={conversation}
            contact={contact}
            messages={conversationMessages}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ["tickets"] })}
          />
        </div>
      </div>
    );
  }

  // ORIGINAL LAYOUT: For non-Intercom tickets or Intercom tickets without conversation
  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Title Header */}
        <Card>
          <CardHeader className="pb-3">
            {/* Single Line: Title + Badges */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <CardTitle className="text-xl truncate">{ticket.name}</CardTitle>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`text-xs ${statusConfig[ticket.status]?.color || statusConfig.Open.color}`}>
                    {isEditing ? (
                      <Select
                        value={editedTicket.status}
                        onValueChange={(value: TicketStatus) =>
                          setEditedTicket({ ...editedTicket, status: value })
                        }
                      >
                        <SelectTrigger className="h-6 border-0 bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["Open", "In Progress", "Pending Customer", "Resolved", "Closed"] as TicketStatus[]).map(
                            (status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      ticket.status
                    )}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs border ${priorityConfig[ticket.priority].color}`}
                  >
                    {isEditing ? (
                      <Select
                        value={editedTicket.priority}
                        onValueChange={(value: TicketPriority) =>
                          setEditedTicket({ ...editedTicket, priority: value })
                        }
                      >
                        <SelectTrigger className="h-6 border-0 bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["Low", "Medium", "High", "Urgent"] as TicketPriority[]).map((priority) => (
                            <SelectItem key={priority} value={priority}>
                              {priority}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      ticket.priority
                    )}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {isEditing ? (
                      <Select
                        value={editedTicket.category}
                        onValueChange={(value: TicketCategory) =>
                          setEditedTicket({ ...editedTicket, category: value })
                        }
                      >
                        <SelectTrigger className="h-6 border-0 bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["Billing", "Tech", "Sales", "Onboarding", "Outage", "General Questions"] as TicketCategory[]).map(
                            (category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      ticket.category
                    )}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedTicket.description || ""}
                    onChange={(e) =>
                      setEditedTicket({ ...editedTicket, description: e.target.value })
                    }
                    rows={4}
                    placeholder="Add ticket description..."
                  />
                ) : (
                  <p className="text-muted-foreground">
                    {ticket.description || "No description provided"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Resolution Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resolution Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedTicket.resolutionSummary || ""}
                    onChange={(e) =>
                      setEditedTicket({ ...editedTicket, resolutionSummary: e.target.value })
                    }
                    rows={4}
                    placeholder="Add resolution details..."
                  />
                ) : (
                  <p className="text-muted-foreground">
                    {ticket.resolutionSummary || "No resolution summary yet"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{ticket.contact.name}</span>
                </div>
                {ticket.contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    
                      href={`mailto:${ticket.contact.email}`}
                      className="text-primary hover:underline"
                    >
                      {ticket.contact.email}
                    </a>
                  </div>
                )}
                {ticket.contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    
                      href={`tel:${ticket.contact.phone}`}
                      className="text-primary hover:underline"
                    >
                      {ticket.contact.phone}
                    </a>
                  </div>
                )}
                {ticket.agencyName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{ticket.agencyName}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Assigned To</span>
                  <span className="font-medium">{ticket.assignedTo || "Unassigned"}</span>
                </div>
                {ticket.value !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Value</span>
                    <span className="font-medium">${ticket.value}</span>
                  </div>
                )}
                {ticket.dueDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Due Date</span>
                    <span className="font-medium">
                      {format(new Date(ticket.dueDate), "MMM dd, yyyy")}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-xs">
                    {format(new Date(ticket.createdAt), "MMM dd, yyyy HH:mm")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="text-xs">
                    {format(new Date(ticket.updatedAt), "MMM dd, yyyy HH:mm")}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {ticket.tags && ticket.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}