import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  state: string;
  read: boolean;
  priority: string;
  customer: {
    id: string;
    name: string;
    email: string;
    type: string;
  };
  assignee: {
    id: string;
    name: string;
    type: string;
  } | null;
  lastMessage: {
    body: string;
    author: string;
    authorType: string;
    createdAt: number;
  };
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  tags: any[];
  topics: any[];
}

interface InboxSidebarProps {
  currentConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
}

export default function InboxSidebar({ 
  currentConversationId,
  onConversationSelect 
}: InboxSidebarProps) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch conversations (no conversationId = fetch all)
  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/intercom/conversation'); // No query param = fetch all
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
        setFilteredConversations(data.conversations);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Filter conversations based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter(conv => 
      conv.customer.name.toLowerCase().includes(query) ||
      conv.customer.email?.toLowerCase().includes(query) ||
      conv.lastMessage.body.toLowerCase().includes(query) ||
      conv.assignee?.name.toLowerCase().includes(query)
    );
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const handleConversationClick = (conversation: Conversation) => {
    // Find the ticket with this conversation ID
    // We'll need to navigate to the ticket detail page
    if (onConversationSelect) {
      onConversationSelect(conversation.id);
    } else {
      // Navigate by conversation ID - we'll need to find the ticket
      // For now, just log
      console.log('Navigate to conversation:', conversation.id);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="w-80 border-r bg-white dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-80 border-r bg-white dark:bg-gray-950 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">Inbox</h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge className="bg-blue-500 text-white h-5 min-w-[20px] px-1.5">
                {unreadCount}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchConversations}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 h-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No conversations found' : 'No open conversations'}
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-800">
            {filteredConversations.map((conv) => {
              const isActive = conv.id === currentConversationId;
              const isFromCustomer = conv.lastMessage.authorType === 'user' || conv.lastMessage.authorType === 'lead';
              
              return (
                <button
                  key={conv.id}
                  onClick={() => handleConversationClick(conv)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                    isActive ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500' : ''
                  } ${!conv.read ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {getInitials(conv.customer.name)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`font-semibold text-sm truncate ${
                          !conv.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {conv.customer.name}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {formatDistanceToNow(new Date(conv.lastMessage.createdAt * 1000), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Last message preview */}
                      <p className={`text-xs truncate mb-2 ${
                        !conv.read ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {isFromCustomer ? '' : `${conv.lastMessage.author}: `}
                        {conv.lastMessage.body || '(No message content)'}
                      </p>

                      {/* Footer - Assignee & Unread */}
                      <div className="flex items-center justify-between">
                        {conv.assignee ? (
                          <Badge variant="outline" className="text-xs">
                            {conv.assignee.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-gray-400">
                            Unassigned
                          </Badge>
                        )}

                        {!conv.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - Total count */}
      <div className="p-3 border-t dark:border-gray-800 text-center text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
        {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}