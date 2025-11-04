import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ConversationSummary from './ConversationSummary';
import { updateTicket } from '@/lib/api-fixed';
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
  Loader2
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

  // Helper to get custom field value - matches api-fixed.ts logic
  const getCustomFieldValue = (fieldId: string): string => {
    const customFields = opportunity?.customFields || [];
    const field = customFields.find((f: any) => f.id === fieldId);
    return field?.fieldValueString || field?.fieldValue || field?.value || field?.field_value || '';
  };

  // Use the same mutation pattern as TicketDetailSheet
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Ticket>) => updateTicket(ticketId, updates),
    onSuccess: () => {
      toast.success("Updated successfully");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      onUpdate?.();
    },
    onError: () => toast.error("Failed to update"),
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

 // Prioritize GHL contact data over Intercom conversation data
  const customer = contact || conversation?.source?.author || {};
  const intercomTicketOwner = opportunity?.intercomAgent || 'Unassigned';
  
  // Use the helper function to get values by ID
  const priority = getCustomFieldValue(CUSTOM_FIELD_IDS.PRIORITY);
  const category = getCustomFieldValue(CUSTOM_FIELD_IDS.CATEGORY);
  const descriptionValue = getCustomFieldValue(CUSTOM_FIELD_IDS.DESCRIPTION);
  const resolutionValue = getCustomFieldValue(CUSTOM_FIELD_IDS.RESOLUTION_SUMMARY);

  console.log('🔍 Opportunity data:', opportunity);
  console.log('🔍 Custom fields:', opportunity?.customFields);

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
            
            {contact?.phone && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                <a 
                  href={`tel:${contact.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {contact.phone}
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
        {contact?.tags && contact.tags.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}