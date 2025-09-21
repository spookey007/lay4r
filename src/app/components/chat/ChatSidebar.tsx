'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket, useChatEvents, SERVER_EVENTS } from '@/contexts/WebSocketContext';

interface ChatSidebarProps {
  onChannelSelect: (channelId: string) => void;
  currentChannelId?: string | null;
}

export default function ChatSidebar({ onChannelSelect, currentChannelId }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalSearchResults, setModalSearchResults] = useState<any[]>([]);
  const [isModalSearching, setIsModalSearching] = useState(false);
  const [isCreatingDM, setIsCreatingDM] = useState(false);
  
  const { 
    channels, 
    setChannels, 
    addChannel, 
    updateChannel, 
    removeChannel,
    setCurrentChannel,
    currentUser
  } = useChatStore();

  const { joinChannel, leaveChannel } = useChatEvents();
  const { on, off } = useWebSocket();

  // Fetch channels
  const { data: channelsData, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { apiFetch } = await import('@/lib/api');
      const response = await apiFetch('/chat/channels');
      return response.json();
    }
  });

  useEffect(() => {
    if (channelsData?.channels) {
      setChannels(channelsData.channels);
    }
  }, [channelsData, setChannels]);

  // Get the other user's data for DM channels
  const getOtherUser = (channel: any) => {
    if (channel.type === 'dm') {
      return channel.members?.find((member: any) => member.userId !== currentUser?.id)?.user;
    }
    return null;
  };

  // Get the appropriate display name for a channel
  const getChannelDisplayName = (channel: any) => {
    if (channel.type === 'dm') {
      const otherUser = getOtherUser(channel);
      if (otherUser) {
        return otherUser.displayName || otherUser.username || 'Unknown User';
      }
      return 'Unknown User';
    }
    
    // For regular channels, use the channel name
    return channel.name || 'Channel';
  };

  // Search both users and channels
  const searchAll = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search users via Express backend
      const { apiFetch } = await import('@/lib/api');
      const usersResponse = await apiFetch(`/chat/search-users?q=${encodeURIComponent(query)}`);
      const usersData = await usersResponse.json();
      const users = usersData.users || [];
      
      // Filter channels locally for now
      const filteredChannels = channels.filter(c => {
        const queryLower = query.toLowerCase();
        
        // For regular channels, search by name and topic
        if (c.type !== 'dm') {
          return (c.name && c.name.toLowerCase().includes(queryLower)) ||
                 (c.topic && c.topic.toLowerCase().includes(queryLower));
        }
        
        // For DMs, search by uidUser displayName and username
        if (c.type === 'dm' && c.uidUser) {
          return (c.uidUser.displayName && c.uidUser.displayName.toLowerCase().includes(queryLower)) ||
                 (c.uidUser.username && c.uidUser.username.toLowerCase().includes(queryLower));
        }
        
        return false;
      });

      // Combine and sort results
      const combinedResults = [
        ...filteredChannels.map((channel: any) => ({ ...channel, searchType: 'channel' })),
        ...users.map((user: any) => ({ ...user, searchType: 'user' }))
      ];
      console.log(combinedResults)
      setSearchResults(combinedResults);
    } catch (error) {

      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Modal search users function
  const searchModalUsers = async (query: string) => {
    if (!query.trim()) {
      setModalSearchResults([]);
      return;
    }

    setIsModalSearching(true);
    try {
      const { apiFetch } = await import('@/lib/api');
      const response = await apiFetch(`/chat/search-users?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setModalSearchResults(data.users || []);
    } catch (error) {

      setModalSearchResults([]);
    } finally {
      setIsModalSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchAll(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, channels]);

  // Debounced modal search
  useEffect(() => {
    if (showUserSearch) {
      const timer = setTimeout(() => {
        searchModalUsers(modalSearchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [modalSearchQuery, showUserSearch]);

  // WebSocket event handlers
  useEffect(() => {
    const handleChannelCreated = (payload: any) => {
      addChannel(payload.channel);
    };

    const handleUserJoined = (payload: any) => {
      updateChannel(payload.channelId, {
        _count: {
          members: (channels.find(c => c.id === payload.channelId)?._count.members || 0) + 1
        }
      });
    };

    const handleUserLeft = (payload: any) => {
      updateChannel(payload.channelId, {
        _count: {
          members: Math.max(0, (channels.find(c => c.id === payload.channelId)?._count.members || 1) - 1)
        }
      });
    };

    on(SERVER_EVENTS.CHANNEL_CREATED, handleChannelCreated);
    on(SERVER_EVENTS.USER_JOINED, handleUserJoined);
    on(SERVER_EVENTS.USER_LEFT, handleUserLeft);

    return () => {
      off(SERVER_EVENTS.CHANNEL_CREATED, handleChannelCreated);
      off(SERVER_EVENTS.USER_JOINED, handleUserJoined);
      off(SERVER_EVENTS.USER_LEFT, handleUserLeft);
    };
  }, [channels, addChannel, updateChannel, on, off]);

  const handleChannelClick = (channelId: string) => {

    onChannelSelect(channelId);

    joinChannel(channelId);

  };

  const handleUserClick = async (user: any) => {
    setIsCreatingDM(true);
    
    try {
      console.log('💬 [DM] Creating DM with user:', {
        userId: user.id,
        username: user.username,
        displayName: user.displayName
      });

      // Create or find DM channel with this user via Express backend
      const { apiFetch } = await import('@/lib/api');
      const response = await apiFetch('/chat/dm/create', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('💬 [DM] DM channel created/found:', data.channel);
        
        // Add the channel to the store if it doesn't exist
        const existingChannel = channels.find(c => c.id === data.channel.id);
        if (!existingChannel) {
          addChannel(data.channel);
        }
        
        // Set as current channel and select it
        setCurrentChannel(data.channel.id);
        onChannelSelect(data.channel.id);
        setShowUserSearch(false);
        setModalSearchQuery('');
        setModalSearchResults([]);
      } else {
        console.error('❌ [DM] Failed to create DM channel:', response.status, response.statusText);
        const errorData = await response.json();
        console.error('❌ [DM] Error details:', errorData);
      }
    } catch (error) {
      console.error('❌ [DM] Error creating DM channel:', error);
    } finally {
      setIsCreatingDM(false);
    }
  };

  const handleModalUserClick = async (user: any) => {
    await handleUserClick(user);
  };

  const handleOpenNewMessage = () => {
    setShowUserSearch(true);
    setModalSearchQuery('');
    setModalSearchResults([]);
  };

  const handleCloseNewMessage = () => {
    setShowUserSearch(false);
    setModalSearchQuery('');
    setModalSearchResults([]);
  };

  // Get all items to display (channels when no search, search results when searching)
  const allItems = searchQuery.trim()
    ? searchResults 
    : channels.map((channel: any) => ({ ...channel, searchType: 'channel' }));


  return (
    <div className="h-full flex flex-col bg-blue-100 border-r-2 border-black">
      {/* Header */}
      <div className="p-3 border-b-2 border-black bg-blue-200">
        <h2 className="text-base font-bold text-black font-mono mb-1">MESSAGES</h2>
        <p className="text-xs text-black font-mono">CHANNELS & DIRECT MESSAGES</p>
      </div>

      {/* Search */}
      <div className="p-3 border-b-2 border-black bg-blue-100">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 SEARCH CHANNELS & PEOPLE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-6 py-2 text-xs border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 placeholder-black font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-black border-t-white animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Content - Unified View */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && !searchQuery.trim() ? (
          <div className="p-4 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-sm mt-2 text-gray-500">Loading...</p>
          </div>
        ) : allItems.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium mb-1">
              {searchQuery.trim() ? 'No results found' : 'No channels available'}
            </p>
            <p className="text-xs">
              {searchQuery.trim() ? 'Try a different search term' : 'Create a channel or search for people to start chatting'}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {allItems.map((item) => {
              if (item.searchType === 'channel') {
                return (
                        <button
                          key={`channel-${item.id}`}
                          onClick={() => handleChannelClick(item.id)}
                          className={`w-full p-2 text-left hover:bg-blue-200 active:bg-blue-300 transition-all duration-200 group relative border-b border-black ${
                            currentChannelId === item.id ? 'bg-blue-200 border-r-4 border-black' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 border-2 border-black flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                              currentChannelId === item.id 
                                ? 'bg-blue-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] scale-105' 
                                : 'bg-white text-black group-hover:bg-blue-200 group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            }`}>
                        {item.type === 'dm' ? (
                          (() => {
                            const otherUser = getOtherUser(item);
                            return otherUser?.avatarUrl ? (
                              <img 
                                src={otherUser.avatarUrl} 
                                alt={otherUser.displayName || otherUser.username}
                                className="w-full h-full rounded-2xl object-cover"
                              />
                            ) : (
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                              </svg>
                            );
                          })()
                        ) : item.type === 'text-group' ? '👥' : '#'}
                      </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                <h4 className={`font-bold text-xs truncate transition-colors font-mono ${
                                  currentChannelId === item.id ? 'text-blue-900' : 'text-black group-hover:text-blue-800'
                                }`}>
                                  {getChannelDisplayName(item)}
                                </h4>
                                {item.type !== 'dm' && (
                                  <span className="text-xs px-1 py-0.5 bg-blue-300 text-black font-mono font-bold border border-black">
                                    CH
                                  </span>
                                )}
                                {item._count?.messages > 0 && (
                                  <span className={`text-xs px-1 py-0.5 font-semibold font-mono border border-black ${
                                    currentChannelId === item.id
                                      ? 'bg-blue-200 text-black'
                                      : 'bg-white text-black group-hover:bg-blue-100'
                                  }`}>
                                    {item._count.messages}
                                  </span>
                                )}
                              </div>
                        {item.topic && (
                          <p className={`text-xs truncate mb-2 font-mono ${
                            currentChannelId === item.id ? 'text-blue-700' : 'text-black group-hover:text-blue-600'
                          }`}>
                            {item.topic}
                          </p>
                        )}
                              <div className="flex items-center justify-between">
                                {item.type !== 'dm' && (
                                  <span className={`text-xs font-medium flex items-center gap-1 font-mono ${
                                    currentChannelId === item.id ? 'text-blue-600' : 'text-black group-hover:text-blue-500'
                                  }`}>
                                    <span className="w-1.5 h-1.5 bg-green-500 border border-black"></span>
                                    {item.members?.length || 0}M
                                  </span>
                                )}
                                {item.updatedAt && (
                                  <span className={`text-xs font-mono ${
                                    currentChannelId === item.id ? 'text-blue-600' : 'text-black group-hover:text-blue-500'
                                  }`}>
                                    {new Date(item.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                      </div>
                    </div>
                    {currentChannelId === item.id && (
                      <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500/20 pointer-events-none"></div>
                    )}
                  </button>
                );
              } else {
                // User item
                return (
                  <button
                    key={`user-${item.id}`}
                    onClick={() => handleUserClick(item)}
                    className="w-full p-3 text-left hover:bg-blue-200 active:bg-blue-300 transition-all duration-200 group relative border-b border-black mx-2 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-green-500 border-2 border-black flex items-center justify-center text-white font-bold text-lg overflow-hidden transition-all duration-200 group-hover:scale-105 group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt={item.username} className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} />
                          ) : (
                            item.username?.[0]?.toUpperCase() || item.walletAddress?.slice(0, 2) || 'U'
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border border-black"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm truncate text-black font-mono group-hover:text-green-800 transition-colors">
                            {item.username || item.displayName || `${item.walletAddress?.slice(0, 6)}...${item.walletAddress?.slice(-4)}`}
                          </h4>
                          <span className="text-xs px-2 py-1 bg-green-300 text-black font-mono font-bold border border-black">
                            USER
                          </span>
                          {item.isVerified && (
                            <div className="text-blue-500" title="Verified">
                              <div className="w-3 h-3 bg-green-500 border border-black"></div>
                            </div>
                          )}
                        </div>
                        {item.walletAddress && (
                          <p className="text-xs text-black font-mono truncate mb-1 group-hover:text-green-600 transition-colors">
                            {item.walletAddress.slice(0, 8)}...{item.walletAddress.slice(-6)}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 border border-black animate-pulse"></div>
                          <span className="text-xs text-black group-hover:text-green-500 font-mono font-bold transition-colors">ONLINE</span>
                        </div>
                      </div>
                      <div className="text-gray-400 group-hover:text-green-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t-2 border-black bg-blue-200">
        <button 
          onClick={handleOpenNewMessage}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 font-mono text-sm"
        >
          <div className="w-4 h-4 bg-white/20 flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          💬 NEW MESSAGE
        </button>
      </div>

      {/* New Message Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-md shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-[80vh] flex flex-col">
            <div className="p-4 border-b-2 border-black bg-blue-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-black font-mono">NEW MESSAGE</h3>
                <button 
                  onClick={handleCloseNewMessage}
                  className="text-black hover:text-red-600 p-1 border border-black bg-white hover:bg-red-200 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 min-h-0">
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="SEARCH BY USERNAME OR WALLET ADDRESS..."
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && modalSearchQuery.trim()) {
                        searchModalUsers(modalSearchQuery);
                      }
                    }}
                    className="w-full px-4 py-2 pr-8 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 text-sm font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    autoFocus
                  />
                  {isModalSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-black border-t-white animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {modalSearchQuery.trim() === '' ? (
                  <div className="text-center py-8 text-black">
                    <div className="w-16 h-16 bg-blue-200 border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-mono font-bold mb-2">START TYPING TO SEARCH</p>
                    <p className="text-xs font-mono">FIND PEOPLE TO START A CONVERSATION</p>
                  </div>
                ) : isModalSearching ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-6 h-6 border-2 border-black border-t-white animate-spin mb-4"></div>
                    <p className="text-sm text-black font-mono font-bold">SEARCHING...</p>
                  </div>
                ) : modalSearchResults.length === 0 ? (
                  <div className="text-center py-8 text-black">
                    <div className="w-16 h-16 bg-blue-200 border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-sm font-mono font-bold mb-2">NO USERS FOUND</p>
                    <p className="text-xs font-mono">TRY SEARCHING WITH A DIFFERENT TERM</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {modalSearchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleModalUserClick(user)}
                        disabled={isCreatingDM}
                        className="w-full p-3 text-left hover:bg-blue-200 active:bg-blue-300 transition-colors group border border-black disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-500 border-2 border-black flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} />
                            ) : (
                              user.username?.[0]?.toUpperCase() || user.walletAddress?.slice(0, 2) || 'U'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm truncate text-black font-mono">
                                {user.username || user.displayName || `${user.walletAddress?.slice(0, 6)}...${user.walletAddress?.slice(-4)}`}
                              </h4>
                              {user.isVerified && (
                                <div className="text-blue-500" title="Verified">
                                  <div className="w-3 h-3 bg-green-500 border border-black"></div>
                                </div>
                              )}
                              {isCreatingDM && (
                                <div className="text-blue-500" title="Creating chat...">
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                </div>
                              )}
                            </div>
                            {user.walletAddress && (
                              <p className="text-xs text-gray-500 truncate">
                                {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-6)}
                              </p>
                            )}
                          </div>
                          <div className="text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button 
                onClick={handleCloseNewMessage}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}