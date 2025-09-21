'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useWebSocket, useChatEvents } from '@/contexts/WebSocketContext';
import { SERVER_EVENTS } from '@/types/events';
import { useWallet } from '@solana/wallet-adapter-react';
import ChatSidebar from '@/app/components/chat/ChatSidebar';
import MessageList from '@/app/components/chat/MessageList';
import MessageInput from '@/app/components/chat/MessageInput';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCurrentUser } from '@/lib/auth';
import ConnectionStatus from '@/components/ConnectionStatus';

const queryClient = new QueryClient();

function ChatContent() {
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [switchingChat, setSwitchingChat] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showChatView, setShowChatView] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  
  const { 
    isConnected, 
    setConnected, 
    setError,
    getCurrentChannel,
    setCurrentChannel,
    addTypingUser,
    removeTypingUser,
    setMessages,
    currentUser,
    setCurrentUser,
    channels
  } = useChatStore();

  const { on, off, isConnected: wsIsConnected, isConnecting, connectionState, getConnectionMetrics, connectIfAuthenticated } = useWebSocket();

  // Sync WebSocket connection state with Zustand
  useEffect(() => {
    setConnected(wsIsConnected);
  }, [wsIsConnected, setConnected]);

  // Check authentication on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { authService } = await import('@/lib/authService');
        const user = await authService.initialize();
        
        if (user) {
          setCurrentUser(user);
          setIsAuth(true);
          // ✅ Trigger connection AFTER auth
          connectIfAuthenticated();
        } else {
          window.location.href = '/';
        }
      } catch (error) {
        window.location.href = '/';
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
  }, [setCurrentUser, connectIfAuthenticated]);

  // Handle WebSocket errors
  useEffect(() => {
    const handleError = (payload: any) => {
      setError(payload.message || 'Connection error');
    };

    on(SERVER_EVENTS.ERROR, handleError);

    return () => {
      off(SERVER_EVENTS.ERROR, handleError);
    };
  }, [on, off, setError]);

  // Handle typing events
  useEffect(() => {
    const handleTypingStarted = (payload: any) => {
      addTypingUser(payload.channelId, {
        userId: payload.userId,
        channelId: payload.channelId,
        timestamp: Date.now()
      });
    };

    const handleTypingStopped = (payload: any) => {
      removeTypingUser(payload.channelId, payload.userId);
    };

    on(SERVER_EVENTS.TYPING_STARTED, handleTypingStarted);
    on(SERVER_EVENTS.TYPING_STOPPED, handleTypingStopped);

    return () => {
      off(SERVER_EVENTS.TYPING_STARTED, handleTypingStarted);
      off(SERVER_EVENTS.TYPING_STOPPED, handleTypingStopped);
    };
  }, [on, off, addTypingUser, removeTypingUser]);

  // Keyboard shortcut for sidebar toggle (Cmd/Ctrl + B)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
    };

    const handleToggleSidebar = () => {
      setSidebarCollapsed(!sidebarCollapsed);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('toggleSidebar', handleToggleSidebar);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('toggleSidebar', handleToggleSidebar);
    };
  }, [sidebarCollapsed]);

  // Note: Removed fallback polling to avoid interference with real-time WebSocket messages

  const handleChannelSelect = async (channelId: string) => {
    console.log('🔄 [CHAT] Channel selected:', channelId);
    
    // Show loader immediately
    setSwitchingChat(true);
    
    setCurrentChannelId(channelId);
    setCurrentChannel(channelId);
    
    // Show chat view and collapse sidebar when channel is selected
    setShowChatView(true);
    setSidebarCollapsed(true);
    
    // Verify the store was updated
    const { currentChannelId: storeChannelId } = useChatStore.getState();
    
    setReplyToMessage(null);
    
    // Fallback: Clear switching state after 5 seconds
    setTimeout(() => {
      console.log('🔄 [CHAT] Fallback: Clearing switchingChat state after timeout');
      setSwitchingChat(false);
    }, 5000);
    
    // Load messages for the selected channel
    try {
      const { apiFetch } = await import('@/lib/api');
      const response = await apiFetch(`/chat/channels/${channelId}/messages?limit=50`);
      
      if (!response.ok) {

        setSwitchingChat(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.messages && Array.isArray(data.messages)) {

        // Set messages in store (backend returns in correct chronological order)
        setMessages(channelId, data.messages);
      } else {

      }
    } catch (error) {

    } finally {
      // Hide loader after a short delay to ensure smooth transition
      setTimeout(() => setSwitchingChat(false), 300);
    }
  };

  const handleReplyToMessage = (messageId: string) => {
    // For now, just set a mock reply message
    setReplyToMessage({ id: messageId, content: 'Mock reply message' });
  };

  const handleClearReply = () => {
    setReplyToMessage(null);
  };

  const handleBackToChannels = () => {
    setShowChatView(false);
    setCurrentChannelId(null);
    setSidebarCollapsed(false);
    setReplyToMessage(null);
  };

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setShowUserInfo(true);
  };

  const handleCloseUserInfo = () => {
    setShowUserInfo(false);
    setSelectedUser(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-100">
        <div className="text-center bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8">
          <div className="w-16 h-16 border-4 border-black border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-black font-mono font-bold text-lg">LOADING...</p>
        </div>
      </div>
    );
  }

  if (!isAuth || !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-100">
        <div className="text-center bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8">
          <h1 className="text-2xl font-bold text-black font-mono mb-4">
            PLEASE SIGN IN TO USE CHAT
          </h1>
          <p className="text-black font-mono">
            You need to be authenticated to access the chat system.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-blue-100 max-w-4xl mx-auto">
      {/* Sidebar - Always visible when not in chat view */}
      <div className={`${showChatView && sidebarCollapsed ? 'w-0' : 'w-72'} flex-shrink-0 border-r-2 border-black transition-all duration-300 overflow-hidden`}>
        <ChatSidebar 
          onChannelSelect={handleChannelSelect}
          currentChannelId={currentChannelId}
        />
      </div>

      {/* Sidebar Toggle Button - Only show when in chat view */}
      {showChatView && (
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`fixed top-4 z-50 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-2 transition-all duration-300 hover:scale-105 group left-4`}
          title={`${sidebarCollapsed ? 'Show' : 'Hide'} Sidebar (Cmd/Ctrl + B)`}
        >
          <svg 
            className={`w-5 h-5 text-black transition-transform duration-300 ${
              sidebarCollapsed ? 'rotate-0' : 'rotate-180'
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          
          {/* Tooltip */}
          <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            {sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
            <div className="text-xs text-gray-300">Cmd/Ctrl + B</div>
          </div>
        </button>
      )}

      {/* Main area - Show channels list or chat view */}
      <div className="flex-1 flex flex-col bg-white border-l-2 border-black overflow-hidden">
        {/* Debug info */}
        <div className="bg-yellow-200 p-2 text-xs font-mono">
          DEBUG: showChatView={showChatView.toString()}, currentChannelId={currentChannelId}, currentUser={!!currentUser}
        </div>
        {!showChatView ? (
          /* Initial view - Show channels list */
          <div className="flex-1 flex items-center justify-center bg-blue-100">
            <div className="bg-red-200 p-4 mb-4 border-2 border-black font-mono text-sm">
              INITIAL VIEW - NO CHAT SELECTED
            </div>
            <div className="text-center max-w-2xl mx-auto p-8">
              <div className="w-32 h-32 bg-blue-200 border-2 border-black flex items-center justify-center mx-auto mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <svg className="w-16 h-16 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-black mb-4 font-mono">WELCOME TO LAYER4 CHAT! 💬</h3>
              <p className="text-black mb-8 leading-relaxed font-mono text-lg">
                SELECT A CHANNEL OR START A CONVERSATION TO BEGIN CHATTING. CONNECT WITH THE COMMUNITY AND SHARE YOUR THOUGHTS!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <div 
                  className="bg-white border-2 border-black p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-blue-50 transition-colors md:cursor-default md:hover:bg-white"
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setSidebarCollapsed(false);
                    }
                  }}
                >
                  <div className="text-3xl mb-3">👥</div>
                  <p className="text-lg font-medium text-black font-mono">FIND PEOPLE</p>
                  <p className="text-sm text-black font-mono">SEARCH FOR USERS TO CHAT WITH</p>
                </div>
                <div 
                  className="bg-white border-2 border-black p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-blue-50 transition-colors md:cursor-default md:hover:bg-white"
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setSidebarCollapsed(false);
                    }
                  }}
                >
                  <div className="text-3xl mb-3">🏠</div>
                  <p className="text-lg font-medium text-black font-mono">JOIN CHANNELS</p>
                  <p className="text-sm text-black font-mono">PARTICIPATE IN GROUP DISCUSSIONS</p>
                </div>
              </div>
            </div>
          </div>
        ) : showChatView && currentChannelId && currentUser ? (
          <>
            {/* Channel header with back button */}
            <ChannelHeader 
              channelId={currentChannelId} 
              sidebarCollapsed={sidebarCollapsed}
              onBackToChannels={handleBackToChannels}
            />
            
            {/* Debug panel - remove in production */}
            <div className="bg-blue-100 border-b-2 border-black px-4 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-black">DEBUG: WEBSOCKET {isConnected ? '✅ CONNECTED' : '❌ DISCONNECTED'}</span>
                <button
                  onClick={async () => {

                    try {
                      const { apiFetch } = await import('@/lib/api');
                      const response = await apiFetch(`/chat/channels/${currentChannelId}/messages?limit=5`);
                      const data = await response.json();

                    } catch (error) {

                    }
                  }}
                  className="bg-blue-500 text-white px-2 py-1 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-mono text-xs"
                >
                  CHECK MESSAGES
                </button>
              </div>
            </div>

            {/* Messages */}
            <MessageList 
              channelId={currentChannelId}
              switchingChat={switchingChat}
              setSwitchingChat={setSwitchingChat}
            />

            {/* Message input - only render when currentUser is available */}
            {currentUser && (
              <MessageInput
                channelId={currentChannelId}
                replyToMessage={replyToMessage}
                onClearReply={handleClearReply}
              />
            )}
          </>
        ) : showChatView && currentChannelId && !currentUser ? (
          <div className="flex-1 flex items-center justify-center bg-blue-100">
            <div className="text-center max-w-md mx-auto p-8 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-24 h-24 bg-red-300 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-black mb-4 font-mono">
                USER SESSION NOT FOUND
              </h1>
              <p className="text-black mb-6 font-mono">
                Your session couldn&apos;t be loaded. Please try refreshing the page or reconnecting your wallet.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors font-mono"
                >
                  REFRESH PAGE
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { apiFetch } = await import('@/lib/api');
                      const response = await apiFetch('/auth/me');
                      const data = await response.json();
                      if (data.user) {
                        setCurrentUser(data.user);
                        setIsAuth(true);
                      }
                    } catch (error) {

                    }
                  }}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors font-mono"
                >
                  RETRY LOADING SESSION
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Connection status */}
        <div className="absolute top-6 right-6">
          <ConnectionStatus showMetrics={true} />
        </div>
          {/* Debug buttons */}
          {/* <div className="flex gap-2">
            <button
              onClick={async () => {
                const { debugAuth, debugWebSocket } = await import('../../lib/debug-auth');
                const authData = await debugAuth();
                if (authData?.user) {
                  const { getSessionToken } = await import('../../lib/auth');
                  const token = getSessionToken();
                  if (token) {
                    debugWebSocket(token);
                  }
                } else {

                }
              }}
              className="bg-purple-500 text-white px-3 py-1 rounded text-xs hover:bg-purple-600"
            >
              🔧 Debug
            </button>
            <button
              onClick={async () => {
                const { createTestSession } = await import('../../lib/debug-auth');
                const sessionData = await createTestSession();
                if (sessionData) {
                  // Session created - WebSocket will auto-connect via useEffect
                  // Refresh the page to apply the new session
                  setTimeout(() => window.location.reload(), 1000);
                }
              }}
              className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
            >
              🧪 Test Login
            </button>
        <button
          onClick={async () => {
            const { quickWalletConnect } = await import('../../lib/debug-auth');
            const loginData = await quickWalletConnect();
            if (loginData) {
              // Login successful - WebSocket will auto-connect via useEffect
              // Refresh the page to apply the new session
              setTimeout(() => window.location.reload(), 1000);
            }
          }}
          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
        >
          👛 Connect Wallet
        </button>
        <button
          onClick={() => {
            console.log('🔄 [CHAT] Manual clear switchingChat');
            setSwitchingChat(false);
          }}
          className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
        >
          🔄 Clear Loading
        </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}

function ChannelHeader({ channelId, sidebarCollapsed, onBackToChannels }: { channelId: string; sidebarCollapsed: boolean; onBackToChannels: () => void }) {
  const { getCurrentChannel } = useChatStore();
  const channel = getCurrentChannel();

  if (!channel) return null;

  const getChannelName = () => {
    if (channel.type === 'dm') {
      // For DM, find the other user (not the current user)
      // We'll use a simple approach - get the first member that's not 'system' 
      // In production, you'd get the current user ID from auth context
      const currentUserId = 'system'; // This should come from auth context
      const otherMember = channel.members.find(m => m.userId !== currentUserId);
      
      if (otherMember?.user) {
        return otherMember.user.displayName || otherMember.user.username || `User ${otherMember.user.id.slice(0, 8)}`;
      }
      
      // Fallback: if we can't find the other member, show the first member
      const firstMember = channel.members[0];
      if (firstMember?.user) {
        return firstMember.user.displayName || firstMember.user.username || `User ${firstMember.user.id.slice(0, 8)}`;
      }
      
      return 'Direct Message';
    }
    return channel.name || 'Unnamed Channel';
  };

  const getChannelDescription = () => {
    if (channel.type === 'dm') {
      return 'Direct message';
    }
    return channel.topic || `${channel._count.members} members`;
  };

  return (
    <div className="border-b-2 border-black bg-blue-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Back to channels button */}
          <button
            onClick={onBackToChannels}
            className="p-2 text-black hover:text-blue-600 border border-black bg-white hover:bg-blue-200 transition-all duration-200 hover:scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            title="Back to Channels"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Sidebar toggle button when collapsed */}
          {sidebarCollapsed && (
            <button
              onClick={() => {
                // This will be handled by the parent component
                const event = new CustomEvent('toggleSidebar');
                window.dispatchEvent(event);
              }}
              className="p-2 text-black hover:text-blue-600 border border-black bg-white hover:bg-blue-200 transition-all duration-200 hover:scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="Show Sidebar (Cmd/Ctrl + B)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          
          <div className="relative">
            <div className="w-12 h-12 bg-blue-500 border-2 border-black flex items-center justify-center text-white font-bold text-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              {channel.type === 'dm' ? getChannelName().charAt(0).toUpperCase() : '#'}
            </div>
            {channel.type === 'dm' && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border border-black"></div>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-black font-mono mb-1">
              {getChannelName()}
            </h1>
            <p className="text-sm text-black font-mono flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 border border-black"></span>
              {getChannelDescription()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Channel actions */}
          <button className="p-2 text-black hover:text-blue-600 border border-black bg-white hover:bg-blue-200 transition-all duration-200 hover:scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button className="p-2 text-black hover:text-blue-600 border border-black bg-white hover:bg-blue-200 transition-all duration-200 hover:scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button className="p-2 text-black hover:text-red-600 border border-black bg-white hover:bg-red-200 transition-all duration-200 hover:scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* User Info Modal */}
      {showUserInfo && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b-2 border-black bg-blue-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-black font-mono">USER INFO</h3>
                <button 
                  onClick={handleCloseUserInfo}
                  className="text-black hover:text-red-600 p-1 border border-black bg-white hover:bg-red-200 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 overflow-hidden">
                  {selectedUser?.avatarUrl ? (
                    <img 
                      src={selectedUser.avatarUrl} 
                      alt={selectedUser.displayName || selectedUser.username} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    selectedUser?.displayName?.[0]?.toUpperCase() || 
                    selectedUser?.username?.[0]?.toUpperCase() || 
                    'U'
                  )}
                </div>
                <h4 className="text-xl font-bold text-black font-mono mb-2">
                  {selectedUser?.displayName || selectedUser?.username || 'Unknown User'}
                </h4>
                {selectedUser?.isVerified && (
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-green-500 border border-black"></div>
                    <span className="text-sm text-green-600 font-mono font-bold">VERIFIED</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-100 border-2 border-black p-4">
                  <h5 className="font-bold text-black font-mono mb-2">USERNAME</h5>
                  <p className="text-black font-mono">{selectedUser?.username || 'Not set'}</p>
                </div>
                
                <div className="bg-blue-100 border-2 border-black p-4">
                  <h5 className="font-bold text-black font-mono mb-2">DISPLAY NAME</h5>
                  <p className="text-black font-mono">{selectedUser?.displayName || 'Not set'}</p>
                </div>
                
                {selectedUser?.walletAddress && (
                  <div className="bg-blue-100 border-2 border-black p-4">
                    <h5 className="font-bold text-black font-mono mb-2">WALLET ADDRESS</h5>
                    <p className="text-black font-mono text-xs break-all">{selectedUser.walletAddress}</p>
                  </div>
                )}
                
                <div className="bg-blue-100 border-2 border-black p-4">
                  <h5 className="font-bold text-black font-mono mb-2">STATUS</h5>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 border border-black"></div>
                    <span className="text-black font-mono">ONLINE</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t-2 border-black bg-gray-100 flex-shrink-0">
              <div className="flex gap-3">
                {selectedUser?.id !== currentUser?.id && (
                  <button
                    onClick={async () => {
                      try {
                        // Find existing DM channel with this user
                        const existingChannel = channels.find(channel => 
                          channel.type === 'dm' && 
                          channel.members?.some((member: any) => member.userId === selectedUser.id)
                        );
                        
                        if (existingChannel) {
                          // Open existing DM
                          handleChannelSelect(existingChannel.id);
                        } else {
                          // Create new DM channel
                          const { apiFetch } = await import('@/lib/api');
                          const response = await apiFetch('/chat/channels', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type: 'dm',
                              name: `DM with ${selectedUser.displayName || selectedUser.username}`,
                              memberIds: [selectedUser.id]
                            })
                          });
                          
                          if (response.ok) {
                            const newChannel = await response.json();
                            handleChannelSelect(newChannel.id);
                          } else {
                            console.error('Failed to create DM channel');
                          }
                        }
                        handleCloseUserInfo();
                      } catch (error) {
                        console.error('Error starting DM:', error);
                      }
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors font-mono"
                  >
                    START DM
                  </button>
                )}
                <button
                  onClick={handleCloseUserInfo}
                  className={`${selectedUser?.id !== currentUser?.id ? 'flex-1' : 'w-full'} bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors font-mono`}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatContent />
    </QueryClientProvider>
  );
}
