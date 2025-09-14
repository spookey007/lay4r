'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useWebSocket, SERVER_EVENTS, useChatEvents } from '@/contexts/WebSocketContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  channelId: string;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
  switchingChat?: boolean;
  setSwitchingChat?: (value: boolean) => void;
  forceRefresh?: boolean;
}

export default function MessageList({ 
  channelId, 
  messagesEndRef: externalMessagesEndRef,
  switchingChat = false,
  setSwitchingChat,
  forceRefresh = false
}: MessageListProps) {
  const { currentUser } = useChatStore();
  const { on, off, isConnected } = useWebSocket();
  const localMessagesEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = externalMessagesEndRef || localMessagesEndRef;
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const { 
    messages, 
    getCurrentMessages, 
    getTypingUsers,
    setMessages, 
    addMessage, 
    updateMessage, 
    removeMessage,
    prependMessages
  } = useChatStore();

  const { fetchMessages, markAsRead } = useChatEvents();

  const currentMessages = getCurrentMessages();
  const typingUsers = getTypingUsers(channelId);
  

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  };

  // Check if user is at bottom of messages
  const checkIfAtBottom = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const threshold = 100; // pixels from bottom
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < threshold);
  };

  // Load more messages when scrolling to top
  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages || currentMessages.length === 0) return;

    setIsLoadingMore(true);
    const oldestMessage = currentMessages[0];
    const before = oldestMessage.sentAt;

    try {
      const { apiFetch } = await import('@/lib/api');
      const response = await apiFetch(`/chat/channels/${channelId}/messages?before=${before}&limit=50`);
      const data = await response.json();
      if (data.messages.length > 0) {
        prependMessages(channelId, data.messages);
      }
      setHasMoreMessages(data.hasMore);
    } catch (error) {

    } finally {
      setIsLoadingMore(false);
    }
  };

  // WebSocket event handlers for channel-specific events
  useEffect(() => {
    const handleMessageReceived = (payload: any) => {

      
      // Parse payload if it's a string
      let messageData = payload;
      if (typeof payload === 'string') {
        try {
          messageData = JSON.parse(payload);
        } catch (error) {

          return;
        }
      }
      

      
      if (messageData.channelId === channelId) {

        
        // Check if this is a real message that should replace an optimistic one
        // Look for optimistic messages with same content and author from the same user
        if (!messageData.isOptimistic) {
          const optimisticMessage = currentMessages.find(msg => 
            msg.isOptimistic && 
            msg.content === messageData.content && 
            msg.authorId === messageData.authorId &&
            Math.abs(new Date(msg.sentAt).getTime() - new Date(messageData.sentAt).getTime()) < 30000 // Within 30 seconds
          );
          
          if (optimisticMessage) {
            console.log('🔄 Replacing optimistic message with real message:', {
              optimisticId: optimisticMessage.id,
              realId: messageData.id,
              content: messageData.content.substring(0, 50) + '...',
              authorId: messageData.authorId
            });
            // Remove the optimistic message and add the real one
            removeMessage(optimisticMessage.id);
            addMessage(messageData);
          } else {
            // Check if message already exists (to prevent duplicates)
            const existingMessage = currentMessages.find(msg => msg.id === messageData.id);
            if (existingMessage) {
              console.log('🔄 Message already exists, updating instead of adding:', messageData.id);
              updateMessage(messageData.id, messageData);
            } else {
              console.log('➕ Adding new message to store:', {
                id: messageData.id,
                content: messageData.content.substring(0, 50) + '...',
                authorId: messageData.authorId,
                isOptimistic: messageData.isOptimistic
              });
              addMessage(messageData);
            }
          }
        } else {
          // This is an optimistic message, check if it already exists first
          const existingMessage = currentMessages.find(msg => msg.id === messageData.id);
          if (existingMessage) {
            console.log('🔄 Optimistic message already exists, updating instead of adding:', messageData.id);
            updateMessage(messageData.id, messageData);
          } else {
            console.log('➕ Adding optimistic message to store:', {
              id: messageData.id,
              content: messageData.content.substring(0, 50) + '...',
              authorId: messageData.authorId,
              isOptimistic: messageData.isOptimistic
            });
            addMessage(messageData);
          }
        }
        
        // Auto-scroll to bottom if user is at bottom
        if (isAtBottom) {
          setTimeout(scrollToBottom, 100);
        }
      } else {

      }
    };

    const handleMessageEdited = (payload: any) => {
      if (payload.channelId === channelId) {

        updateMessage(payload.id, payload);
      }
    };

    const handleMessageDeleted = (payload: any) => {
      if (payload.channelId === channelId) {

        removeMessage(payload.messageId);
      }
    };

    const handleReactionAdded = (payload: any) => {

      // Find the message and add the reaction
      const messageIndex = currentMessages.findIndex(msg => msg.id === payload.messageId);
      if (messageIndex >= 0) {
        const updatedMessage = { ...currentMessages[messageIndex] };
        // Check if reaction already exists
        const existingReactionIndex = updatedMessage.reactions.findIndex(
          r => r.userId === payload.userId && r.emoji === payload.emoji
        );
        
        if (existingReactionIndex === -1) {
          updatedMessage.reactions = [...updatedMessage.reactions, payload];
          updateMessage(payload.messageId, updatedMessage);
        }
      }
    };

    const handleReactionRemoved = (payload: any) => {

      // Find the message and remove the reaction
      const messageIndex = currentMessages.findIndex(msg => msg.id === payload.messageId);
      if (messageIndex >= 0) {
        const updatedMessage = { ...currentMessages[messageIndex] };
        updatedMessage.reactions = updatedMessage.reactions.filter(
          reaction => !(reaction.userId === payload.userId && reaction.emoji === payload.emoji)
        );
        updateMessage(payload.messageId, updatedMessage);
      }
    };

    const handleTypingStarted = (payload: any) => {
      if (payload.channelId === channelId) {

        const { addTypingUser } = useChatStore.getState();
        addTypingUser(channelId, {
          userId: payload.userId,
          channelId: payload.channelId,
          timestamp: Date.now()
        });
      }
    };

    const handleTypingStopped = (payload: any) => {
      if (payload.channelId === channelId) {

        const { removeTypingUser } = useChatStore.getState();
        removeTypingUser(channelId, payload.userId);
      }
    };

    const handleUserJoined = (payload: any) => {
      if (payload.channelId === channelId) {

        // You might want to show a system message or update member count
      }
    };

    const handleUserLeft = (payload: any) => {
      if (payload.channelId === channelId) {

        // You might want to show a system message or update member count
      }
    };

    const handleUserStatusChanged = (payload: any) => {

      const { updateUser } = useChatStore.getState();
      updateUser(payload.userId, {
        status: payload.status,
        lastSeen: payload.lastSeen
      });
    };

    const handleReadReceiptUpdated = (payload: any) => {

      // Find the message and update read receipts
      const messageIndex = currentMessages.findIndex(msg => msg.id === payload.messageId);
      if (messageIndex >= 0) {
        const updatedMessage = { ...currentMessages[messageIndex] };
        const existingReceiptIndex = updatedMessage.readReceipts.findIndex(
          r => r.userId === payload.userId
        );
        
        if (existingReceiptIndex >= 0) {
          updatedMessage.readReceipts[existingReceiptIndex] = {
            id: updatedMessage.readReceipts[existingReceiptIndex].id,
            messageId: payload.messageId,
            userId: payload.userId,
            readAt: payload.readAt
          };
        } else {
          updatedMessage.readReceipts = [...updatedMessage.readReceipts, {
            id: `${payload.messageId}-${payload.userId}`,
            messageId: payload.messageId,
            userId: payload.userId,
            readAt: payload.readAt
          }];
        }
        
        updateMessage(payload.messageId, updatedMessage);
      }
    };

    const handleMessagesLoaded = (payload: any) => {
      if (payload.channelId === channelId) {
        console.log('📚 Messages loaded from server:', {
          channelId: payload.channelId,
          messageCount: payload.messages.length,
          messages: payload.messages.map((m: any) => ({ id: m.id, content: m.content.substring(0, 30) + '...', sentAt: m.sentAt }))
        });
        setMessages(channelId, payload.messages);
        setHasMoreMessages(payload.messages.length === 50); // Assuming 50 is the limit
      }
    };

    // Register all event handlers only when connected

    if (isConnected) {

      on(SERVER_EVENTS.MESSAGE_RECEIVED, handleMessageReceived);
      on(SERVER_EVENTS.MESSAGE_EDITED, handleMessageEdited);
      on(SERVER_EVENTS.MESSAGE_DELETED, handleMessageDeleted);
      on(SERVER_EVENTS.REACTION_ADDED, handleReactionAdded);
      on(SERVER_EVENTS.REACTION_REMOVED, handleReactionRemoved);
      on(SERVER_EVENTS.TYPING_STARTED, handleTypingStarted);
      on(SERVER_EVENTS.TYPING_STOPPED, handleTypingStopped);
      on(SERVER_EVENTS.USER_JOINED, handleUserJoined);
      on(SERVER_EVENTS.USER_LEFT, handleUserLeft);
      on(SERVER_EVENTS.USER_STATUS_CHANGED, handleUserStatusChanged);
      on(SERVER_EVENTS.READ_RECEIPT_UPDATED, handleReadReceiptUpdated);
      on(SERVER_EVENTS.MESSAGES_LOADED, handleMessagesLoaded);

    } else {

    }

    return () => {
      // Cleanup all event handlers
      off(SERVER_EVENTS.MESSAGE_RECEIVED, handleMessageReceived);
      off(SERVER_EVENTS.MESSAGE_EDITED, handleMessageEdited);
      off(SERVER_EVENTS.MESSAGE_DELETED, handleMessageDeleted);
      off(SERVER_EVENTS.REACTION_ADDED, handleReactionAdded);
      off(SERVER_EVENTS.REACTION_REMOVED, handleReactionRemoved);
      off(SERVER_EVENTS.TYPING_STARTED, handleTypingStarted);
      off(SERVER_EVENTS.TYPING_STOPPED, handleTypingStopped);
      off(SERVER_EVENTS.USER_JOINED, handleUserJoined);
      off(SERVER_EVENTS.USER_LEFT, handleUserLeft);
      off(SERVER_EVENTS.USER_STATUS_CHANGED, handleUserStatusChanged);
      off(SERVER_EVENTS.READ_RECEIPT_UPDATED, handleReadReceiptUpdated);
      off(SERVER_EVENTS.MESSAGES_LOADED, handleMessagesLoaded);
    };
  }, [channelId, currentMessages, updateMessage, removeMessage, addMessage, setMessages, on, off, isAtBottom, isConnected]);

  // Load initial messages
  useEffect(() => {
    if (channelId) {
      console.log('📚 Loading messages for channel:', channelId, {
        hasMessages: !!(messages[channelId] && messages[channelId].length > 0),
        messageCount: messages[channelId]?.length || 0,
        isConnected
      });
      
      // Always fetch messages when channel changes, regardless of existing messages
      // This ensures we get the latest messages when reopening the chat
      fetchMessages(channelId, 50);
      
      // If WebSocket is not connected, retry after a short delay
      if (!isConnected) {
        console.log('📚 WebSocket not connected, retrying message fetch in 2 seconds...');
        const retryTimeout = setTimeout(() => {
          console.log('📚 Retrying message fetch...');
          fetchMessages(channelId, 50);
        }, 2000);
        
        return () => clearTimeout(retryTimeout);
      }
    }
    
    // Clear switching chat state after loading messages
    if (switchingChat && setSwitchingChat) {
      setTimeout(() => setSwitchingChat(false), 500);
    }
  }, [channelId, fetchMessages, switchingChat, setSwitchingChat, isConnected]);

  // Force refresh when widget is reopened
  useEffect(() => {
    if (forceRefresh && channelId) {
      console.log('🔄 [MESSAGELIST] Force refresh triggered for channel:', channelId);
      fetchMessages(channelId, 50);
      
      // Also check for any missed messages by fetching with a recent timestamp
      const recentTimestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // Last 5 minutes
      console.log('🔄 [MESSAGELIST] Checking for missed messages since:', recentTimestamp);
      fetchMessages(channelId, 100, recentTimestamp);
    }
  }, [forceRefresh, channelId, fetchMessages]);

  // Mark messages as read when channel changes
  useEffect(() => {
    if (channelId && currentMessages.length > 0) {
      const unreadMessages = currentMessages.filter(msg => !msg.readReceipts || msg.readReceipts.length === 0);
      unreadMessages.forEach(msg => markAsRead(msg.id));
    }
  }, [channelId, currentMessages, markAsRead]);

  // Auto-scroll to bottom on channel change
  useEffect(() => {
    if (channelId) {
      setTimeout(scrollToBottom, 100);
      setIsAtBottom(true);
    }
  }, [channelId]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative bg-gray-50 h-full" data-message-list>
      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        style={{
          maxHeight: '100%',
          height: '100%',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch' // iOS smooth scrolling
        }}
        onScroll={(e) => {
          checkIfAtBottom();
          
          // Load more messages when scrolled to top
          const element = e.target as HTMLDivElement;
          if (element.scrollTop === 0 && hasMoreMessages && !isLoadingMore) {
            loadMoreMessages();
          }
        }}
      >
        {/* Loading indicator for older messages */}
        {isLoadingMore && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-white rounded-full px-4 py-2 shadow-sm">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              Loading older messages...
            </div>
          </div>
        )}
        
        {/* Loading indicator when switching chats */}
        {switchingChat && (
          <div className="flex justify-center items-center py-12">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-gray-600 font-medium">Loading messages...</p>
            </div>
          </div>
        )}
        
        {/* Welcome message for L4 Community Group */}
        {!switchingChat && channelId === 'cmfhetm9i0000eqxogha9gi9l' && currentMessages.length === 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 text-center border border-blue-100 mb-6">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Welcome to L4 Community Group!</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              This is where the Layer4 community comes together to discuss the future of financial stability, 
              share insights, and build connections in the DeFi space.
            </p>
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-700 text-left">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-blue-500">📋</span>
                  Community Guidelines
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    Be respectful and constructive in all discussions
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    Share valuable insights and market analysis
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    Ask questions and help fellow community members
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    Stay focused on Layer4 and DeFi topics
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Render messages */}
        {!switchingChat && currentMessages.map((message, index) => {
          const prevMessage = index > 0 ? currentMessages[index - 1] : null;
          const nextMessage = index < currentMessages.length - 1 ? currentMessages[index + 1] : null;
          
          const showAvatar = !prevMessage || 
            prevMessage.authorId !== message.authorId || 
            new Date(message.sentAt).getTime() - new Date(prevMessage.sentAt).getTime() > 5 * 60 * 1000; // 5 minutes

          const showTimestamp = !nextMessage || 
            nextMessage.authorId !== message.authorId ||
            new Date(nextMessage.sentAt).getTime() - new Date(message.sentAt).getTime() > 5 * 60 * 1000; // 5 minutes

          return (
            <div key={message.id} className="group mb-1">
              <MessageBubble
                message={message}
                showAvatar={showAvatar}
                showTimestamp={showTimestamp}
                isConsecutive={!showAvatar}
              />
            </div>
          );
        })}

        {/* Empty state */}
        {!switchingChat && currentMessages.length === 0 && channelId !== 'cmfhetm9i0000eqxogha9gi9l' && (
          <div className="flex justify-center items-center py-12">
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-200 shadow-sm max-w-md">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No messages yet</h3>
              <p className="text-gray-500 leading-relaxed">Be the first to start the conversation in this channel!</p>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-4 py-3 max-w-xs">
              <TypingIndicator users={typingUsers} />
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <div className="absolute bottom-6 right-6 z-10">
          <button
            onClick={scrollToBottom}
            className="bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 p-3 rounded-full shadow-lg border border-gray-200 transition-all hover:shadow-xl hover:scale-105"
            title="Scroll to bottom"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}