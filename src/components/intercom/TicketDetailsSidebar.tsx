import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ConversationSummary from './ConversationSummary';
import { updateTicket, fetchTags, updateContactTags } from '@/lib/api-fixed';
import type { Ticket } from '@/lib/types';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Calendar,
  DollarSign,
  Tag,
  FileText,
  CheckCircle2,
  Loader2,
  X,
  Plus,
  Search,
  Check
} from 'lucide-react';

// Custom Field IDs
const CUSTOM_FIELD_IDS = {
  DESCRIPTION: 'y9aYiEln1CpSuz6u3rtE',
  RESOLUTION_SUMMARY: 'ZzsDH7pErVhwLqJt1NjA',
  PRIORITY: 'QMiATAEcjFjQc9q8FxW6',
  CATEGORY: 'eCjK3IHuhErwlkyWJ4Wx'
};

// Date formatting helpers
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface TicketDetailsSidebarProps {
  ticketId: string;
  conversationId: string;
  opportunity?: any;
  conversation?: any;
  contact?: any;
  messages?: any[];
  onUpdate?: () => void;
}

export default function TicketDetailsSidebar({ 
  ticketId, 
  conversationId,
  opportunity,
  conversation,
  contact,
  messages = [],
  onUpdate
}: TicketDetailsSidebarProps) {
  const queryClient = useQueryClient();
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingResolution, setIsEditingResolution] = useState(false);
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState('');
  const [tagSearch, setTagSearch] = useState("");
  const [tagsOpen, setTagsOpen] = useState(false);
  const [savingTagId, setSavingTagId] = useState<string | null>(null);

  const { data: availableTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

  // Helper to get custom field value - matches api-fixed.ts logic
  const getCustomFieldValue = (fieldId: string): string => {
    const customFields = opportunity?.customFields || [];
    const field = customFields.find((f: any) => f.id === fieldId);
    return field?.fieldValueString || field?.fieldValue || field?.value || field?.field_value || '';
  };

  // ✅ OPTIMISTIC UPDATE: Instant UI updates
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Ticket>) => updateTicket(ticketId, updates),
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["tickets"] });
      
      // Snapshot the previous value
      const previousTickets = queryClient.getQueryData(["tickets"]);
      
      // Optimistically update the cache INSTANTLY
      queryClient.setQueryData(["tickets"], (old: any) => {
        if (!old) return old;
        return old.map((ticket: any) => 
          ticket.id === ticketId 
            ? { ...ticket, customFields: ticket.customFields?.map((field: any) => {
                if (updates.description && field.id === CUSTOM_FIELD_IDS.DESCRIPTION) {
                  return { ...field, fieldValueString: updates.description, value: updates.description };
                }
                if (updates.resolutionSummary && field.id === CUSTOM_FIELD_IDS.RESOLUTION_SUMMARY) {
                  return { ...field, fieldValueString: updates.resolutionSummary, value: updates.resolutionSummary };
                }
                return field;
              }), ...updates }
            : ticket
        );
      });
      
      toast.success("Updated successfully");
      
      return { previousTickets };
    },
    onError: (err, updates, context) => {
      // Rollback on error
      if (context?.previousTickets) {
        queryClient.setQueryData(["tickets"], context.previousTickets);
      }
      toast.error("Failed to update");
    },
    onSettled: () => {
      // Always refetch after mutation to sync with backend
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      onUpdate?.();
    },
  });

  const handleSaveDescription = async () => {
    try {
      await updateMutation.mutateAsync({ description });
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Failed to save description:', error);
    }
  };

  const handleSaveResolution = async () => {
    try {
      await updateMutation.mutateAsync({ resolutionSummary: resolution });
      setIsEditingResolution(false);
    } catch (error) {
      console.error('Failed to save resolution:', error);
    }
  };

  const handleToggleTag = async (tagName: string) => {
    if (!opportunity?.contactId) {
      toast.error("Contact ID not available");
      return;
    }

    const currentTags = opportunity?.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((tag: string) => tag !== tagName)
      : [...currentTags, tagName];
    
    setSavingTagId(tagName);
    
    // ✅ INSTANT UPDATE: Update cache immediately
    await queryClient.cancelQueries({ queryKey: ["tickets"] });
    queryClient.setQueryData(["tickets"], (old: any) => {
      if (!old) return old;
      return old.map((ticket: any) => 
        ticket.id === ticketId 
          ? { ...ticket, tags: newTags }
          : ticket
      );
    });
    
    try {
      console.log('💾 Saving tags to backend:', newTags);
      await updateContactTags(opportunity.contactId, newTags);
      toast.success(currentTags.includes(tagName) ? "Tag removed" : "Tag added");
      setTagsOpen(false);
    } catch (error) {
      console.error('Failed to update tags:', error);
      toast.error("Failed to update tags");
      // Refetch on error to revert
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    } finally {
      setSavingTagId(null);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      onUpdate?.();
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    if (!opportunity?.contactId) return;
    
    const currentTags = opportunity?.tags || [];
    const newTags = currentTags.filter((tag: string) => tag !== tagName);
    
    setSavingTagId(tagName);
    
    // ✅ INSTANT UPDATE: Update cache immediately
    await queryClient.cancelQueries({ queryKey: ["tickets"] });
    queryClient.setQueryData(["tickets"], (old: any) => {
      if (!old) return old;
      return old.map((ticket: any) => 
        ticket.id === ticketId 
          ? { ...ticket, tags: newTags }
          : ticket
      );
    });
    
    try {
      console.log('💾 Removing tag from backend:', tagName);
      await updateContactTags(opportunity.contactId, newTags);
      toast.success("Tag removed");
    } catch (error) {
      console.error('Failed to remove tag:', error);
      toast.error("Failed to remove tag");
      // Refetch on error to revert
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    } finally {
      setSavingTagId(null);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      onUpdate?.();
    }
  };

  const filteredAvailableTags = availableTags.filter((tag: any) =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  // Extract REAL customer (filter out Fin/bot) - UPDATED WITH PRIORITY 4
  const getRealCustomer = () => {
    console.log('🔍 getRealCustomer called with:', {
      hasContact: !!contact,
      contactName: contact?.name,
      hasConversation: !!conversation,
      hasConversationContacts: !!conversation?.contacts?.contacts?.[0],
      hasSourceAuthor: !!conversation?.source?.author,
      hasOpportunityContact: !!opportunity?.contact,
      opportunityContactName: opportunity?.contact?.name
    });

    // Priority 1: Use GHL contact if available and valid
    if (contact?.name && contact.name !== 'Fin' && contact.name !== 'Unknown' &&
        contact.email && !contact.email.includes('operator+') && !contact.email.includes('@intercom.io')) {
      console.log('✅ Using Priority 1: GHL contact prop');
      return contact;
    }
    
    // Priority 2: Get from conversation contacts array (MOST RELIABLE)
    if (conversation?.contacts?.contacts?.[0]) {
      const contactData = conversation.contacts.contacts[0];
      const name = contactData.name || contactData.email || 'Unknown';
      const email = contactData.email || '';
      
      // Skip if it's Fin
      if (name !== 'Fin' && !email.includes('operator+') && !email.includes('@intercom.io')) {
        console.log('✅ Using Priority 2: conversation.contacts[0]');
        return contactData;
      } else {
        console.log('⚠️ Skipping Fin in conversation.contacts[0]');
      }
    }
    
    // Priority 3: Get from source.author (only if not Fin and type === 'user')
    if (conversation?.source?.author) {
      const author = conversation.source.author;
      const name = author.name || author.email || 'Unknown';
      const email = author.email || '';
      
      if (author.type === 'user' && name !== 'Fin' && 
          !email.includes('operator+') && !email.includes('@intercom.io')) {
        console.log('✅ Using Priority 3: conversation.source.author');
        return author;
      } else {
        console.log('⚠️ Skipping Fin/operator in source.author:', { name, email, type: author.type });
      }
    }
    
    // Priority 4: Fallback to opportunity.contact (ticket.contact from GHL)
    if (opportunity?.contact?.name && opportunity.contact.name !== 'Unknown') {
      console.log('✅ Using Priority 4: opportunity.contact (GHL ticket contact)');
      return opportunity.contact;
    }
    
    console.log('❌ No valid customer found, returning Unknown');
    return { name: 'Unknown', email: '' };
  };

  const customer = getRealCustomer();
  const intercomTicketOwner = opportunity?.intercomAgent || 'Unassigned';
  
  // Use the helper function to get values by ID
  const priority = getCustomFieldValue(CUSTOM_FIELD_IDS.PRIORITY);
  const category = getCustomFieldValue(CUSTOM_FIELD_IDS.CATEGORY);
  const descriptionValue = getCustomFieldValue(CUSTOM_FIELD_IDS.DESCRIPTION);
  const resolutionValue = getCustomFieldValue(CUSTOM_FIELD_IDS.RESOLUTION_SUMMARY);

  const currentTags = opportunity?.tags || [];

  return (
    <div className="w-80 border-l bg-white dark:bg-gray-950 overflow-y-auto">
      <div className="p-4 space-y-4">
        
        {/* AI Summary - Using existing ConversationSummary component */}
        {messages.length > 0 && (
          <div className="-mx-4 -mt-4">
            <ConversationSummary
              conversationId={conversationId}
              messages={messages}
              opportunityId={ticketId}
            />
          </div>
        )}

        {/* Contact Information */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Contact Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium">{customer.name || 'Unknown'}</div>
              </div>
            </div>
            
            {customer.email && (
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                <a 
                  href={`mailto:${customer.email}`}
                  className="text-blue-600 hover:underline break-all"
                >
                  {customer.email}
                </a>
              </div>
            )}
            
            {(customer.phone || contact?.phone) && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                <a 
                  href={`tel:${customer.phone || contact?.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {customer.phone || contact?.phone}
                </a>
              </div>
            )}
            
            {contact?.companyName && (
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                <span>{contact.companyName}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Details */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Details</h3>
          <div className="space-y-3 text-sm">
            
            <div className="flex justify-between items-start">
              <span className="text-gray-500">Intercom Ticket Owner</span>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {intercomTicketOwner}
              </Badge>
            </div>

            {priority && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Priority</span>
                <Badge variant="outline" className={
                  priority === 'High' || priority === 'Urgent'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : priority === 'Medium'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }>
                  {priority}
                </Badge>
              </div>
            )}

            {category && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Category</span>
                <Badge variant="outline">{category}</Badge>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Value</span>
              <span className="font-medium flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {opportunity?.monetaryValue || 0}
              </span>
            </div>

            <Separator />

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Created</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {opportunity?.createdAt && formatDate(opportunity.createdAt)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Updated</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {opportunity?.updatedAt && formatDate(opportunity.updatedAt)}
              </span>
            </div>
          </div>
        </Card>

        {/* Description */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description
            </h3>
            {!isEditingDescription && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setDescription(descriptionValue);
                  setIsEditingDescription(true);
                }}
              >
                Edit
              </Button>
            )}
          </div>
          
          {isEditingDescription ? (
            <div className="space-y-2">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description..."
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleSaveDescription} 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsEditingDescription(false)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {descriptionValue || 'No description provided'}
            </p>
          )}
        </Card>

        {/* Resolution Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Resolution Summary
            </h3>
            {!isEditingResolution && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setResolution(resolutionValue);
                  setIsEditingResolution(true);
                }}
              >
                Edit
              </Button>
            )}
          </div>
          
          {isEditingResolution ? (
            <div className="space-y-2">
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Add resolution summary..."
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleSaveResolution} 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsEditingResolution(false)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {resolutionValue || 'No resolution summary yet'}
            </p>
          )}
        </Card>

        {/* Tags */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Tags
          </h3>
          
          {/* Selected Tags */}
          <div className="flex flex-wrap gap-2 mb-3 min-h-[36px] p-2 border rounded-md bg-background">
            {currentTags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  disabled={savingTagId === tag}
                  className="ml-1 hover:text-destructive"
                >
                  {savingTagId === tag ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </button>
              </Badge>
            ))}
            {currentTags.length === 0 && (
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
                    placeholder="Search tags..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {filteredAvailableTags.length > 0 ? (
                  <div className="space-y-1">
                    {filteredAvailableTags.map((tag: any) => {
                      const isSelected = currentTags.includes(tag.name);
                      const isSaving = savingTagId === tag.name;
                      
                      return (
                        <div
                          key={tag.id}
                          className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                          onClick={() => !isSaving && handleToggleTag(tag.name)}
                        >
                          <div className="flex-1">{tag.name}</div>
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : isSelected ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : null}
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
        </Card>

      </div>
    </div>
  );
}