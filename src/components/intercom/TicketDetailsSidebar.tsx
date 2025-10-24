import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  Plus,
  Loader2
} from 'lucide-react';

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

const formatRelativeTime = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

interface TicketDetailsSidebarProps {
  ticketId: string;
  conversationId: string;
  opportunity?: any;
  conversation?: any;
  contact?: any;
  onUpdate?: () => void;
}

export default function TicketDetailsSidebar({ 
  ticketId, 
  conversationId,
  opportunity,
  conversation,
  contact,
  onUpdate
}: TicketDetailsSidebarProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingResolution, setIsEditingResolution] = useState(false);
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState('');
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveDescription = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/ghl/opportunities/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customFields: [{ key: 'description', value: description }] 
        }),
      });
      
      if (response.ok) {
        setIsEditingDescription(false);
        onUpdate?.();
      }
    } catch (error) {
      console.error('Failed to save description:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveResolution = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/ghl/opportunities/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customFields: [{ key: 'resolution_summary', value: resolution }] 
        }),
      });
      
      if (response.ok) {
        setIsEditingResolution(false);
        onUpdate?.();
      }
    } catch (error) {
      console.error('Failed to save resolution:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const customer = conversation?.source?.author || {};
  const intercomTicketOwner = opportunity?.customFields?.find(
    (f: any) => f.key === 'intercom_ticket_owner'
  )?.value;
  const priority = opportunity?.customFields?.find(
    (f: any) => f.key === 'priority'
  )?.value;
  const category = opportunity?.customFields?.find(
    (f: any) => f.key === 'category'
  )?.value;

  return (
    <div className="w-80 border-l bg-white dark:bg-gray-950 overflow-y-auto">
      <div className="p-4 space-y-4">
        
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
              <Badge variant="outline">
                {intercomTicketOwner || 'Unassigned'}
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
                  setDescription(opportunity?.customFields?.find((f: any) => f.key === 'description')?.value || '');
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
                <Button size="sm" onClick={handleSaveDescription} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsEditingDescription(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {opportunity?.customFields?.find((f: any) => f.key === 'description')?.value || 'No description provided'}
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
                  setResolution(opportunity?.customFields?.find((f: any) => f.key === 'resolution_summary')?.value || '');
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
                <Button size="sm" onClick={handleSaveResolution} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsEditingResolution(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {opportunity?.customFields?.find((f: any) => f.key === 'resolution_summary')?.value || 'No resolution summary yet'}
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