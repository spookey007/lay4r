'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket, useChatEvents } from '@/contexts/WebSocketContext';
import { useChatStore } from '@/stores/chatStore';
import { useToastNotifications } from '@/components/Toast';

interface MessageInputProps {
  channelId: string | null;
  onReplyTo?: (messageId: string) => void;
  replyToMessage?: any;
  onClearReply?: () => void;
}

export default function MessageInput({ 
  channelId, 
  onReplyTo, 
  replyToMessage, 
  onClearReply 
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { sendChatMessage, startTyping, stopTyping } = useChatEvents();
  const { getCurrentChannel, currentChannelId, channels, setCurrentChannel, setMessages, addMessage, removeMessage, currentUser } = useChatStore();
  const { isConnected, isConnecting } = useWebSocket();
  const toast = useToastNotifications();
  const channel = getCurrentChannel();
  
  // Debug current user and wait for it to be loaded
  useEffect(() => {
    if (!currentUser) {
      // Try to reload user from store
      const storeState = useChatStore.getState();
      
      // If still no user, try to reload from auth service
      if (!storeState.currentUser) {
        const reloadUser = async () => {
          try {
            const { authService } = await import('@/lib/authService');
            const user = await authService.fetchUser();
            
            if (user) {
              const { setCurrentUser } = useChatStore.getState();
              setCurrentUser(user);
            }
          } catch (error) {
          }
        };
        
        // Retry after 2 seconds
        const timeoutId = setTimeout(reloadUser, 2000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [currentUser]);
  
  // Sync store with channelId prop and load messages (workaround for channel selection issue)
  useEffect(() => {
    if (channelId && currentChannelId !== channelId) {
      setCurrentChannel(channelId);
      
      // Load messages for this channel
      const loadMessages = async () => {
        try {
          const { apiFetch } = await import('@/lib/api');
          const response = await apiFetch(`/chat/channels/${channelId}/messages?limit=50`);
          
          if (!response.ok) {
            return;
          }
          
          const data = await response.json();
          
          if (data.messages && Array.isArray(data.messages)) {
            setMessages(channelId, data.messages); // No reverse needed - backend returns in correct order
          } else {
          }
        } catch (error) {
        }
      };
      
      loadMessages();
    }
  }, [channelId, currentChannelId, setCurrentChannel, setMessages]);
  const maxLength = 2000;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Handle typing indicators (only when WebSocket is connected)
  useEffect(() => {
    
    if (!isConnected || !channelId) {
      return; // Don't send typing events if not connected or no channel
    }
    
    if (content.trim()) {
      if (!isTyping) {
        console.log('👀 [TYPING] Current user started typing:', {
          channelId,
          currentUserId: currentUser?.id,
          content: content.trim()
        });
        setIsTyping(true);
        startTyping(channelId);
      }
      
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set new timeout to stop typing (reduced from 3s to 2s for better responsiveness)
      const newTimeout = setTimeout(() => {
        setIsTyping(false);
        stopTyping(channelId);
      }, 2000); // Stop typing after 2 seconds of inactivity
      
      setTypingTimeout(newTimeout);
    } else {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
      if (isTyping) {
        setIsTyping(false);
        stopTyping(channelId);
      }
    }

    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [content, channelId, startTyping, stopTyping, isConnected]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    
    if (!content.trim() && attachments.length === 0) {
      return;
    }
    if (!channelId) {
      return;
    }
    
    if (!isConnected) {
      if (isConnecting) {
        toast.warning('Connecting...', 'Please wait for the connection to be established');
      } else {
        toast.error('Not Connected', 'Please check your connection and try again');
      }
      return;
    }

    // Check if current user is available
    if (!currentUser) {
      toast.error('Session Error', 'Please refresh the page to reload your session');
      return;
    }

    // Create optimistic message for immediate display
    const optimisticMessage = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      channelId: channelId,
      authorId: currentUser.id,
      author: {
        id: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
        walletAddress: currentUser.walletAddress,
        isVerified: currentUser.isVerified,
        status: currentUser.status,
        lastSeen: currentUser.lastSeen
      },
      sentAt: new Date().toISOString(),
      attachments: attachments,
      repliedToMessageId: replyToMessage?.id || null,
      reactions: [],
      readReceipts: [],
      isSystem: false,
      isOptimistic: true // Flag to identify optimistic messages
    };

    // Add optimistic message immediately
    console.log('🚀 Adding optimistic message:', {
      id: optimisticMessage.id,
      content: optimisticMessage.content.substring(0, 50) + '...',
      authorId: optimisticMessage.authorId,
      isOptimistic: optimisticMessage.isOptimistic
    });
    addMessage(optimisticMessage);
    
    // Send via WebSocket immediately (non-blocking)
    try {
      // console.log('🚀 Sending message via WebSocket...');
      const startTime = Date.now();
      
      sendChatMessage(
        channelId,
        content.trim(),
        attachments,
        replyToMessage?.id
      );
      
      const endTime = Date.now();
      console.log(`✅ Message sent successfully in ${endTime - startTime}ms`);
    } catch (error) {
      console.error('❌ Error sending message via WebSocket:', error);
      toast.error('Send Failed', 'Failed to send message. Please try again.');
      // Don't remove the message, just log the error
    }
    
    
    // Clear input
    setContent('');
    setAttachments([]);
    if (onClearReply) {
      onClearReply();
    }
    
    // Stop typing when message is sent
    if (isConnected && channelId) {
      stopTyping(channelId);
    }
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;
    
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const { apiFetch } = await import('@/lib/api');
        const response = await apiFetch('/chat/media/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        return response.json();
      });
      
      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachments(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload Failed', 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '💯'];

  // Don't render if currentUser is not available
  if (!currentUser) {
    // Try to reload user from API as fallback
    const reloadUser = async () => {
      try {
        const { apiFetch } = await import('@/lib/api');
        const response = await apiFetch('/auth/me');
        const data = await response.json();
        
        if (data.user) {
          const { setCurrentUser } = useChatStore.getState();
          setCurrentUser(data.user);
        } else {
        }
      } catch (error) {
      }
    };

    // Try to reload user after a short delay
    setTimeout(reloadUser, 1000);

    return (
      <div className="bg-white border-t-4 border-black shadow-[0px_-4px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-2 border-black border-t-transparent"></div>
            <span className="text-sm sm:text-base font-bold font-mono text-black">LOADING SESSION...</span>
          </div>
          <div className="text-center">
            <button 
              onClick={reloadUser}
              className="text-xs sm:text-sm text-black hover:text-blue-600 font-bold font-mono bg-yellow-300 hover:bg-yellow-400 px-4 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 hover:scale-105"
            >
              RETRY LOADING
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className=" border-t-4 border-black shadow-[0px_-4px_0px_0px_rgba(0,0,0,1)]">
      {/* Reply indicator */}
      {replyToMessage && (
        <div className="px-4 py-2 bg-green-300 border-b-2 border-black">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-bold text-black mb-1 flex items-center gap-2 font-mono">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                REPLYING TO {replyToMessage.author?.username || 'UNKNOWN'}
              </div>
              <div className="text-sm text-black truncate bg-white px-3 py-2 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-mono">
                {replyToMessage.content}
              </div>
            </div>
            <button
              onClick={onClearReply}
              className="ml-3 text-black hover:text-red-600 p-1 hover:bg-red-300 transition-all duration-200 hover:scale-110 border border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              aria-label="Clear reply"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-cyan-300 border-b-2 border-black">
          <div className="text-xs font-bold text-black mb-2 flex items-center gap-2 font-mono">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            {attachments.length} ATTACHMENT{attachments.length > 1 ? 'S' : ''}
          </div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="relative bg-white border border-black p-2 min-w-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-xs truncate max-w-[120px] pr-6 font-bold font-mono text-black">
                  {attachment.filename}
                </div>
                <div className="text-xs text-gray-600 mt-1 font-mono">
                  {(attachment.size / 1024).toFixed(1)} KB
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-sm hover:bg-red-600 flex items-center justify-center transition-all duration-200 hover:scale-110 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                  aria-label="Remove attachment"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-3 sm:px-4 py-2 sm:py-3">
        {/* Emoji toggle button - WhatsApp style - hidden on mobile */}
        <div className="hidden sm:flex justify-between items-center mb-2 sm:mb-3">
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            className="text-sm px-3 py-2 bg-yellow-300 hover:bg-yellow-400 transition-all duration-200 flex items-center gap-2 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:scale-105 font-bold font-mono"
          >
            <span>😀</span>
            <span className="text-xs">EMOJIS</span>
          </button>
        </div>

        {/* Quick emoji reactions - hidden by default */}
        {showEmojis && (
          <div className="flex flex-wrap gap-2 mb-3">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                className="text-lg p-2 hover:bg-yellow-200 transition-all duration-200 hover:scale-110 border border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                title={`Add ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-sm px-3 py-2 bg-cyan-300 hover:bg-cyan-400 transition-all duration-200 flex items-center gap-2 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:scale-105 font-bold font-mono"
            >
              <span>😀</span>
              <span className="text-xs">MORE</span>
            </button>
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 mb-3">
            <div className="grid grid-cols-8 gap-2">
              {['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="w-10 h-10 text-lg hover:bg-yellow-200 transition-all duration-200 hover:scale-110 border border-black bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-black">
              <span className="text-xs text-black font-bold font-mono">CLICK TO ADD EMOJI</span>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="text-xs text-black hover:text-red-600 font-bold font-mono bg-red-300 hover:bg-red-400 px-3 py-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {/* Main input area */}
        <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type a message...`}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-12 sm:pr-20 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 resize-none text-sm placeholder-gray-600 font-mono font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              style={{ 
                minHeight: '40px',
                maxHeight: '120px'
              }}
              maxLength={maxLength}
              disabled={isUploading}
            />
            
            {/* Typing indicator */}
            {/* {isTyping && (
              <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-black bg-yellow-300 px-2 py-1 border border-black font-bold font-mono shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-black animate-bounce"></div>
                  <div className="w-1 h-1 bg-black animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-black animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>typing...</span>
              </div>
            )} */}
            
            <div className="absolute bottom-1.5 sm:bottom-2 right-2 flex items-center gap-1 sm:gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              />
              {!isConnected && (
                <div className="flex items-center gap-1 text-xs text-black bg-red-300 px-2 py-1 border border-black font-bold font-mono shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  <div className="w-2 h-2 bg-black animate-pulse"></div>
                  <span className="hidden sm:inline">{isConnecting ? 'CONNECTING...' : 'DISCONNECTED'}</span>
                  <span className="sm:hidden">{isConnecting ? '...' : 'X'}</span>
                </div>
              )}
              {/* Attachment button - hidden on mobile */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="hidden sm:flex text-black hover:text-blue-600 disabled:opacity-50 p-1 hover:bg-blue-200 transition-all duration-200 hover:scale-110 border border-black bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                title="Upload files"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <span className="text-xs text-black font-mono font-bold bg-yellow-300 px-2 py-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hidden sm:inline">
                {content.length}/{maxLength}
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={(!content.trim() && attachments.length === 0) || isUploading}
            className={`px-2 sm:px-4 py-2 sm:py-3 transition-all duration-200 flex items-center justify-center font-bold min-w-[36px] sm:min-w-[60px] h-[36px] sm:h-[44px] flex-shrink-0 z-10 relative border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] self-end ${
              !isConnected 
                ? 'bg-red-500 text-white cursor-wait hover:scale-105' 
                : (!content.trim() && attachments.length === 0) || isUploading
                  ? 'bg-gray-400 text-white cursor-not-allowed opacity-75'
                  : 'bg-green-400 hover:bg-green-500 text-black hover:scale-105 font-mono'
            }`}
            title={!isConnected ? (isConnecting ? "Connecting..." : "Disconnected") : (!content.trim() && attachments.length === 0) ? "Type a message" : "Send message (Enter)"}
          >
            {isUploading ? (
              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-black border-t-transparent animate-spin"></div>
            ) : (
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="text-xs font-mono hidden sm:inline">SEND</span>
              </div>
            )}
          </button>
        </form>

        {/* Channel info */}
        {/* <div className="mt-3 text-xs text-black flex items-center gap-2 font-mono font-bold">
          <span className="flex items-center gap-1 bg-cyan-300 px-2 py-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-sm">{channel?.type === 'text-group' ? '🏠' : '#'}</span>
            <span className="font-bold">{channel?.name}</span>
          </span>
          <span className="bg-yellow-300 px-2 py-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            {channel?.members?.length || 0} MEMBERS
          </span>
          <span className="bg-green-300 px-2 py-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            ENTER TO SEND • SHIFT+ENTER FOR NEW LINE
          </span>
        </div> */}
      </div>
    </div>
  );
}