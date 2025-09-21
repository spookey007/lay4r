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
  const [showChatView, setShowChatView] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    isConnected: storeConnected, 
    setConnected, 
    setError,
    getCurrentChannel,
    messages,
    currentUser,
    channels
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
    
    // Show chat view and hide sidebar when channel is selected
    setShowChatView(true);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const handleBackToChannels = () => {
    setShowChatView(false);
    setCurrentChannelId(null);
    setShowSidebar(true);
    setReplyToMessage(null);
  };

  const handleReplyToMessage = (messageId: string) => {
    setReplyToMessage({ id: messageId, content: 'Reply to message' });
  };

  const handleClearReply = () => {
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
            className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 z-50 w-full h-full md:w-[600px] lg:w-[700px] md:h-[600px] lg:h-[700px] md:max-h-[90vh] p-0"
            style={{
              transformOrigin: "bottom right"
            }}
          >
            <div className="chat-widget h-full flex bg-white shadow-2xl border-0 md:border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-gray-900 to-black text-white p-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
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
                <div className={`absolute md:relative z-30 md:z-0 transition-all duration-300 ease-in-out w-full md:w-64 lg:w-72 h-full ${
                  showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                } ${!showSidebar && showChatView ? 'md:w-0 md:overflow-hidden' : ''}`}>
                  <div className="bg-white h-full border-r border-gray-200 flex flex-col pt-0">
                    <ChatSidebar 
                      onChannelSelect={handleChannelSelect}
                      currentChannelId={currentChannelId}
                    />
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 flex flex-col min-w-0">
                  {!showChatView ? (
                    /* Initial view - Show channels list */
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                      <div className="text-center p-8 max-w-md mx-auto">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Mainnet Chat</h3>
                        <p className="text-gray-500 mb-6">Select a channel from the sidebar to start chatting with the Layer4 community</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <div 
                            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors md:cursor-default md:hover:bg-white"
                            onClick={() => {
                              if (window.innerWidth < 768) {
                                setShowSidebar(true);
                              }
                            }}
                          >
                            <div className="text-2xl mb-2">👥</div>
                            <p className="text-sm font-medium text-gray-700">Find People</p>
                            <p className="text-xs text-gray-500">Search for users to chat with</p>
                          </div>
                          <div 
                            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors md:cursor-default md:hover:bg-white"
                            onClick={() => {
                              if (window.innerWidth < 768) {
                                setShowSidebar(true);
                              }
                            }}
                          >
                            <div className="text-2xl mb-2">🏠</div>
                            <p className="text-sm font-medium text-gray-700">Join Channels</p>
                            <p className="text-xs text-gray-500">Participate in group discussions</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : showChatView && currentChannelId ? (
                    <>
                      {/* Chat Header */}
                      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Back to channels button */}
                          <button
                            onClick={handleBackToChannels}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                            title="Back to Channels"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>

                          {!showSidebar && (
                            <button
                              onClick={() => setShowSidebar(true)}
                              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                              aria-label="Show sidebar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
                              <div className="space-y-1">
                                {getCurrentChannel()?.members?.map((member: any) => (
                                  <button
                                    key={member.id}
                                    onClick={() => handleUserClick(member.user)}
                                    className="w-full p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                  >
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                                      {member.user?.avatarUrl ? (
                                        <img 
                                          src={member.user.avatarUrl} 
                                          alt={member.user.displayName || member.user.username} 
                                          className="w-full h-full object-cover" 
                                        />
                                      ) : (
                                        member.user?.displayName?.[0]?.toUpperCase() || 
                                        member.user?.username?.[0]?.toUpperCase() || 
                                        'U'
                                      )}
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="font-medium text-sm text-gray-900">
                                        {member.user?.displayName || member.user?.username || 'Unknown User'}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {member.user?.isVerified ? 'Verified' : 'User'}
                                      </div>
                                    </div>
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                  </button>
                                )) || []}
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
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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