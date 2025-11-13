import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ConversationSummary from './ConversationSummary';
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
import { toast } from 'sonner';

// Custom Field IDs
const CUSTOM_FIELD_IDS = {
  DESCRIPTION: 'bxSIsLb4VIKd9ct56M6l',
  RESOLUTION_SUMMARY: '4EyD7zuMT5aOUy3hNZYg'
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
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingResolution, setIsEditingResolution] = useState(false);
  const [description, setDescription] = useState(opportunity?.description || '');
  const [resolution, setResolution] = useState(opportunity?.resolutionSummary || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveDescription = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/opportunities/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customFields: [{
            id: CUSTOM_FIELD_IDS.DESCRIPTION,
            field_value: description
          }]
        }),
      });

      if (!response.ok) throw new Error('Failed to update description');

      toast.success('Description updated');
      setIsEditingDescription(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to save description:', error);
      toast.error('Failed to update description');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveResolution = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/opportunities/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customFields: [{
            id: CUSTOM_FIELD_IDS.RESOLUTION_SUMMARY,
            field_value: resolution
          }]
        }),
      });

      if (!response.ok) throw new Error('Failed to update resolution summary');

      toast.success('Resolution summary updated');
      setIsEditingResolution(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to save resolution:', error);
      toast.error('Failed to update resolution summary');
    } finally {
      setIsSaving(false);
    }
  };

  // Extract customer info - MATCH IntercomChatView's getRealCustomer() logic
  let customerName = 'Unknown';
  let customerEmail = '';
  let customerPhone = '';
  
  // Priority 1: Use contact prop if valid (passed from parent)
  if (contact?.name && contact.name !== 'Unknown' && contact.name !== 'Fin' &&
      contact?.email && !contact.email.includes('operator+') && !contact.email.includes('@intercom.io')) {
    customerName = contact.name;
    customerEmail = contact.email || '';
    customerPhone = contact.phone || '';
    console.log('✅ Using contact prop for customer:', { name: customerName, email: customerEmail });
  }
  
  // Priority 2: From conversation.contacts.contacts[0] (most reliable for real customer)
  if (customerName === 'Unknown' && conversation?.contacts?.contacts?.[0]) {
    const contactData = conversation.contacts.contacts[0];
    const name = contactData.name || contactData.email || 'Unknown Customer';
    const email = contactData.email || '';
    
    // Skip if it's Fin
    if (name !== 'Fin' && !email.includes('operator+') && !email.includes('@intercom.io')) {
      customerName = name;
      customerEmail = email;
      console.log('✅ Using conversation.contacts[0] for customer:', { name: customerName, email: customerEmail });
    } else {
      console.log('⚠️ Skipping Fin in contacts[0]:', { name, email });
    }
  }
  
  // Priority 3: From conversation.source.author (with Fin filtering) - LOWER PRIORITY
  if (customerName === 'Unknown' && conversation?.source?.author) {
    const author = conversation.source.author;
    const name = author.name || '';
    const email = author.email || '';
    
    // Only use if NOT Fin or operator AND is a user/lead
    if (author.type === 'user' && name && name !== 'Fin' && 
        !email.includes('operator+') && !email.includes('@intercom.io')) {
      customerName = name;
      customerEmail = email;
      console.log('✅ Using source.author for customer:', { name: customerName, email: customerEmail });
    } else {
      console.log('⚠️ Skipping Fin/operator in source.author:', { name, email, type: author.type });
    }
  }
  
  // Priority 4: From opportunity contact (GHL data fallback)
  if (customerName === 'Unknown' && opportunity?.contact) {
    customerName = opportunity.contact.name || opportunity.contact.email || 'Unknown';
    customerEmail = opportunity.contact.email || '';
    customerPhone = opportunity.contact.phone || '';
    console.log('✅ Using opportunity.contact for customer:', { name: customerName, email: customerEmail });
  }

  const intercomTicketOwner = opportunity?.intercomAgent || 'Unassigned';
  const priority = opportunity?.customFields?.find(
    (f: any) => f.key === 'priority'
  )?.value || opportunity?.priority;
  const category = opportunity?.customFields?.find(
    (f: any) => f.key === 'category'
  )?.value || opportunity?.category;

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
            <User className="h-4 w-4" />
            Contact Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">{customerName}</div>
                {customerName === 'Unknown' && (
                  <div className="text-xs text-muted-foreground">No contact data available</div>
                )}
              </div>
            </div>
            
            {customerEmail && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <a 
                  href={`mailto:${customerEmail}`}
                  className="text-sm text-primary hover:underline break-all"
                >
                  {customerEmail}
                </a>
              </div>
            )}
            
            {customerPhone && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <a 
                  href={`tel:${customerPhone}`}
                  className="text-sm text-primary hover:underline"
                >
                  {customerPhone}
                </a>
              </div>
            )}
            
            {opportunity?.agencyName && (
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm">{opportunity.agencyName}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Details */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground">Intercom Owner</span>
              <span className="font-medium text-right">{intercomTicketOwner}</span>
            </div>
            
            {opportunity?.assignedTo && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">GHL Assigned</span>
                <span className="font-medium text-right">{opportunity.assignedTo}</span>
              </div>
            )}
            
            {priority && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Priority</span>
                <Badge variant="outline" className="capitalize">{priority}</Badge>
              </div>
            )}
            
            {category && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium text-right">{category}</span>
              </div>
            )}
            
            {opportunity?.value !== undefined && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Value</span>
                <span className="font-medium">${opportunity.value}</span>
              </div>
            )}
            
            <Separator className="my-2" />
            
            {opportunity?.createdAt && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Created</span>
                <span className="text-xs text-right">{formatDate(opportunity.createdAt)}</span>
              </div>
            )}
            
            {opportunity?.updatedAt && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Updated</span>
                <span className="text-xs text-right">{formatDate(opportunity.updatedAt)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Description */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </h3>
            {!isEditingDescription && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingDescription(true)}
                className="h-7 text-xs"
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
                className="min-h-[100px] text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveDescription}
                  disabled={isSaving}
                  className="h-8"
                >
                  {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDescription(opportunity?.description || '');
                    setIsEditingDescription(false);
                  }}
                  disabled={isSaving}
                  className="h-8"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {description || 'No description provided'}
            </p>
          )}
        </Card>

        {/* Resolution Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Resolution Summary
            </h3>
            {!isEditingResolution && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingResolution(true)}
                className="h-7 text-xs"
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
                className="min-h-[100px] text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveResolution}
                  disabled={isSaving}
                  className="h-8"
                >
                  {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setResolution(opportunity?.resolutionSummary || '');
                    setIsEditingResolution(false);
                  }}
                  disabled={isSaving}
                  className="h-8"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {resolution || 'No resolution summary yet'}
            </p>
          )}
        </Card>

        {/* Tags */}
        {opportunity?.tags && opportunity.tags.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {opportunity.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
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