import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, RefreshCw, AlertCircle } from 'lucide-react';

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
  availableTicketConversationIds?: string[];
}

export default function InboxSidebar({ 
  currentConversationId,
  onConversationSelect,
  availableTicketConversationIds = []
}: InboxSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching conversations list...');
      const response = await fetch('/api/intercom/conversation');
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ API Error:', errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          console.error('❌ Failed to parse error response');
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Conversations data:', data);
      
      const convs = Array.isArray(data.conversations) ? data.conversations : [];
      
      setConversations(convs);
      setFilteredConversations(convs);
      setUnreadCount(data.unreadCount || 0);
      
    } catch (error) {
      console.error('❌ Failed to fetch conversations:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMsg);
      setConversations([]);
      setFilteredConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter(conv => {
      try {
        return (
          conv.customer?.name?.toLowerCase().includes(query) ||
          conv.customer?.email?.toLowerCase().includes(query) ||
          conv.lastMessage?.body?.toLowerCase().includes(query) ||
          conv.assignee?.name?.toLowerCase().includes(query)
        );
      } catch (e) {
        return false;
      }
    });
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const handleConversationClick = (conversation: Conversation) => {
    if (onConversationSelect) {
      onConversationSelect(conversation.id);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const stripHtml = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - (timestamp * 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading && conversations.length === 0) {
    return (
      <div className="w-80 border-r bg-white dark:bg-gray-950 flex flex-col items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading conversations...</p>
      </div>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <div className="w-80 border-r bg-white dark:bg-gray-950 flex flex-col items-center justify-center h-full p-6">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Failed to load inbox</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">{error}</p>
        <Button onClick={fetchConversations} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
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
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

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
              const isFromCustomer = conv.lastMessage?.authorType === 'user' || conv.lastMessage?.authorType === 'lead';
              const hasTicket = availableTicketConversationIds.includes(conv.id);
              
              return (
                <button
                  key={conv.id}
                  onClick={() => handleConversationClick(conv)}
                  className={`w-full p-4 text-left transition-all duration-200 cursor-pointer relative
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900/50 shadow-sm' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                    }
                    ${!conv.read && !isActive ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}
                  `}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#4890F8] to-blue-600" />
                  )}
                  
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 transition-all
                      ${isActive 
                        ? 'bg-gradient-to-br from-[#4890F8] to-blue-600 ring-2 ring-blue-400 ring-offset-2' 
                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                      }
                    `}>
                      {getInitials(conv.customer?.name)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`font-semibold text-sm truncate transition-colors
                          ${isActive 
                            ? 'text-blue-900 dark:text-blue-100' 
                            : !conv.read 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-gray-700 dark:text-gray-300'
                          }
                        `}>
                          {conv.customer?.name || 'Unknown'}
                        </h3>
                        <span className={`text-xs flex-shrink-0 transition-colors
                          ${isActive 
                            ? 'text-blue-700 dark:text-blue-300 font-medium' 
                            : 'text-gray-500 dark:text-gray-400'
                          }
                        `}>
                          {conv.lastMessage?.createdAt 
                            ? formatRelativeTime(conv.lastMessage.createdAt)
                            : 'unknown'
                          }
                        </span>
                      </div>

                      {/* Last message preview */}
                      <p className={`text-xs truncate mb-2 transition-colors
                        ${isActive
                          ? 'text-blue-800 dark:text-blue-200 font-medium'
                          : !conv.read 
                            ? 'text-gray-700 dark:text-gray-300 font-medium' 
                            : 'text-gray-500 dark:text-gray-400'
                        }
                      `}>
                        {isFromCustomer ? '' : `${conv.lastMessage?.author || 'Unknown'}: `}
                        {stripHtml(conv.lastMessage?.body || '(No message content)')}
                      </p>

                      {/* Footer - Assignee & Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {conv.assignee ? (
                            <Badge 
                              variant="outline" 
                              className={`text-xs transition-colors
                                ${isActive 
                                  ? 'bg-blue-200 text-blue-900 border-blue-300 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700' 
                                  : ''
                                }
                              `}
                            >
                              {conv.assignee.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-gray-400">
                              Unassigned
                            </Badge>
                          )}
                          
                          {!hasTicket && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-400">
                              No Ticket
                            </Badge>
                          )}
                        </div>

                        {!conv.read && (
                          <div className={`w-2 h-2 rounded-full transition-colors
                            ${isActive ? 'bg-blue-600' : 'bg-blue-500'}
                          `}></div>
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