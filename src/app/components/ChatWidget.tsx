'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useWebSocket, useChatEvents, SERVER_EVENTS } from '@/contexts/WebSocketContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatSidebar from './chat/ChatSidebar';
import MessageList from './chat/MessageList';
import MessageInput from './chat/MessageInput';

const queryClient = new QueryClient();

interface ChatWidgetProps {
  className?: string;
}

function ChatWidgetContent({ className = '' }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [switchingChat, setSwitchingChat] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    isConnected: storeConnected, 
    setConnected, 
    setError,
    getCurrentChannel,
    messages,
    currentUser
  } = useChatStore();

  const { on, off } = useWebSocket();
  const { joinChannel } = useChatEvents();
  
  // Use Solana wallet connection state
  const { connected, publicKey } = useWallet();

  // WebSocket connection status
  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
      setConnected(connected);
    };

    on('CONNECTION', handleConnectionChange);

    return () => {
      off('CONNECTION', handleConnectionChange);
    };
  }, [on, off, setConnected]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Auto-hide sidebar on mobile when opening chat
  useEffect(() => {
    if (open && window.innerWidth < 768) {
      setShowSidebar(false);
    } else if (open && window.innerWidth >= 768) {
      setShowSidebar(true);
    }
  }, [open]);

  // Refresh messages when widget is opened
  useEffect(() => {
    if (open && currentChannelId) {
      // console.log('🔄 [WIDGET] Widget opened, will refresh messages for channel:', currentChannelId);
      // Trigger force refresh
      setForceRefresh(true);
      setTimeout(() => setForceRefresh(false), 100);
      
      // Also check for missed messages by joining the channel
      joinChannel(currentChannelId);
    }
  }, [open, currentChannelId]);

  const handleChannelSelect = (channelId: string) => {
    setSwitchingChat(true);
    setCurrentChannelId(channelId);
    setReplyToMessage(null);
    setShowMembersList(false);
    
    // Hide sidebar on mobile after selecting a channel
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const handleReplyToMessage = (messageId: string) => {
    setReplyToMessage({ id: messageId, content: 'Reply to message' });
  };

  const handleClearReply = () => {
    setReplyToMessage(null);
  };

  const canShow = useMemo(() => connected, [connected]);

  // Get the other user's data for DM channels
  const getOtherUser = (channel: any) => {
    if (channel.type === 'dm') {
      return channel.members?.find((member: any) => member.userId !== currentUser?.id)?.user;
    }
    return null;
  };

  // Get the appropriate display name for the channel header
  const getChannelDisplayName = () => {
    const channel = getCurrentChannel();
    if (!channel) return 'Channel';
    
    // For DMs, find the other member (not the current user)
    if (channel.type === 'dm') {
      const otherUser = getOtherUser(channel);
      if (otherUser) {
        return otherUser.displayName || otherUser.username || 'Unknown User';
      }
      return 'Unknown User';
    }
    
    // For regular channels, show the channel name
    return channel.name || 'Channel';
  };

  // Get the appropriate member count for the channel header
  const getChannelMemberCount = () => {
    const channel = getCurrentChannel();
    if (!channel) return null;
    
    // For DMs, don't show member count
    if (channel.type === 'dm') {
      return null;
    }
    
    // For regular channels, show member count
    return `${channel.members?.length || 0} members`;
  };

  // Only show chat widget if wallet is connected
  if (!canShow) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            aria-label="Open chat"
            className="fixed bottom-4 right-4 z-50 w-16 h-16 bg-black hover:bg-gray-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300"
            style={{ 
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.418 16.97 20 12 20C10.88 20 9.84 19.81 8.9 19.48L3 21L4.52 15.1C4.19 14.16 4 13.12 4 12C4 7.582 8.03 4 12 4C16.97 4 21 7.582 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
            {/* Notification badge */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white">
              3
            </div>
          </motion.button>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.4
            }}
            className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 z-50 w-full h-full md:w-[900px] lg:w-[1000px] md:h-[700px] lg:h-[800px] md:max-h-[90vh] p-0"
            style={{
              transformOrigin: "bottom right"
            }}
          >
            <div className="chat-widget h-full flex bg-white rounded-none md:rounded-2xl shadow-2xl border-0 md:border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-gray-900 to-black text-white p-4 flex items-center justify-between z-10 md:rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <span className="text-xl">💬</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Mainnet Chat</h3>
                    {/* <div className="flex items-center gap-2 text-sm text-gray-300">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
                    </div> */}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mobile sidebar toggle */}
                  <button 
                    className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => setShowSidebar(!showSidebar)}
                    aria-label="Toggle sidebar"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Close chat"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 flex pt-20 min-h-0 bg-gray-50">
                {/* Mobile overlay */}
                {showSidebar && (
                  <div 
                    className="md:hidden absolute inset-0 bg-black/50 z-20 pt-20"
                    onClick={() => setShowSidebar(false)}
                  />
                )}
                
                {/* Sidebar */}
                <div className={`absolute md:relative z-30 md:z-0 transition-all duration-300 ease-in-out w-full md:w-80 lg:w-96 h-full ${
                  showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                } ${!showSidebar && currentChannelId ? 'md:w-0 md:overflow-hidden' : ''}`}>
                  <div className="bg-white h-full border-r border-gray-200 flex flex-col pt-0">
                    <ChatSidebar 
                      onChannelSelect={handleChannelSelect}
                      currentChannelId={currentChannelId}
                    />
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 flex flex-col min-w-0">
                  {currentChannelId ? (
                    <>
                      {/* Chat Header */}
                      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {!showSidebar && (
                            <button
                              onClick={() => setShowSidebar(true)}
                              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                              aria-label="Show sidebar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                          )}
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {getCurrentChannel()?.type === 'dm' ? (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                              </svg>
                            ) : (
                              '#'
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg text-gray-900">
                              {getChannelDisplayName()}
                            </h4>
                            {getChannelMemberCount() && (
                              <span className="text-sm text-gray-500">
                                {getChannelMemberCount()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowMembersList(!showMembersList)}
                            className="hidden md:flex p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                            title="Show members"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className="hidden md:flex p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                            title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showSidebar ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 flex min-h-0">
                        {/* Messages */}
                        <div className="flex-1 bg-gray-50">
                          <MessageList 
                            channelId={currentChannelId} 
                            messagesEndRef={messagesEndRef}
                            switchingChat={switchingChat}
                            setSwitchingChat={setSwitchingChat}
                            forceRefresh={forceRefresh}
                          />
                        </div>

                        {/* Members List */}
                        {showMembersList && (
                          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
                            <div className="p-4 border-b border-gray-200">
                              <h3 className="font-semibold text-gray-900">Members</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                              {/* Members list will be populated here */}
                              <div className="space-y-1">
                                {[1, 2, 3, 4, 5].map((member) => (
                                  <button
                                    key={member}
                                    className="w-full p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                  >
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                      U
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="font-medium text-sm text-gray-900">User {member}</div>
                                      <div className="text-xs text-gray-500">Online</div>
                                    </div>
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Message Input */}
                      <div className="bg-white border-t border-gray-200">
                        <MessageInput
                          channelId={currentChannelId}
                          replyToMessage={replyToMessage}
                          onClearReply={handleClearReply}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-white">
                      <div className="text-center p-8">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Mainnet Chat</h3>
                        <p className="text-gray-500 mb-6 max-w-md">Select a channel from the sidebar to start chatting with the Layer4 community</p>
                        {/* <button
                          onClick={() => setShowSidebar(true)}
                          className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors font-medium"
                        >
                          Browse Channels
                        </button> */}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function ChatWidget(props: ChatWidgetProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatWidgetContent {...props} />
    </QueryClientProvider>
  );
}