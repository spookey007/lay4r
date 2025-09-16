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

const queryClient = new QueryClient();

function ChatContent() {
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [switchingChat, setSwitchingChat] = useState(false);
  
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
    setCurrentUser
  } = useChatStore();

  const { on, off, isConnected: wsIsConnected, connectIfAuthenticated } = useWebSocket(); // ✅ Get isConnected from context

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

  // Note: Removed fallback polling to avoid interference with real-time WebSocket messages

  const handleChannelSelect = async (channelId: string) => {
    console.log('🔄 [CHAT] Channel selected:', channelId);
    
    // Show loader immediately
    setSwitchingChat(true);
    
    setCurrentChannelId(channelId);
    setCurrentChannel(channelId);
    
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuth || !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please sign in to use chat
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You need to be authenticated to access the chat system.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <ChatSidebar 
          onChannelSelect={handleChannelSelect}
          currentChannelId={currentChannelId}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-white rounded-l-2xl shadow-xl border-l border-gray-200 overflow-hidden">
        {currentChannelId && currentUser ? (
          <>
            {/* Channel header */}
            <ChannelHeader channelId={currentChannelId} />
            
            {/* Debug panel - remove in production */}
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span>Debug: WebSocket {isConnected ? '✅ Connected' : '❌ Disconnected'}</span>
                <button
                  onClick={async () => {

                    try {
                      const { apiFetch } = await import('@/lib/api');
                      const response = await apiFetch(`/chat/channels/${currentChannelId}/messages?limit=5`);
                      const data = await response.json();

                    } catch (error) {

                    }
                  }}
                  className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                >
                  Check Messages
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
        ) : currentChannelId && !currentUser ? (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                User Session Not Found
              </h1>
              <p className="text-gray-600 mb-6">
                Your session couldn&apos;t be loaded. Please try refreshing the page or reconnecting your wallet.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Refresh Page
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
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Retry Loading Session
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Layer4 Chat! 💬</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Select a channel or start a conversation with someone to begin chatting. Connect with the community and share your thoughts!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="text-2xl mb-2">👥</div>
                  <p className="text-sm font-medium text-gray-700">Find People</p>
                  <p className="text-xs text-gray-500">Search for users to chat with</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="text-2xl mb-2">🏠</div>
                  <p className="text-sm font-medium text-gray-700">Join Channels</p>
                  <p className="text-xs text-gray-500">Participate in group discussions</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connection status */}
        <div className="absolute top-6 right-6 space-y-2">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg border ${
            isConnected 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
          </div>
          {/* Debug info */}
          {currentUser && (
            <div className="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs">
              User: {currentUser.username || currentUser.walletAddress?.slice(0, 8)}
            </div>
          )}
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

function ChannelHeader({ channelId }: { channelId: string }) {
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
    <div className="border-b border-gray-100 bg-gradient-to-r from-white to-blue-50 px-8 py-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {channel.type === 'dm' ? getChannelName().charAt(0).toUpperCase() : '#'}
            </div>
            {channel.type === 'dm' && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {getChannelName()}
            </h1>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              {getChannelDescription()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Channel actions */}
          <button className="p-3 text-gray-500 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 hover:scale-105">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button className="p-3 text-gray-500 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 hover:scale-105">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button className="p-3 text-gray-500 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200 hover:scale-105">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>
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
