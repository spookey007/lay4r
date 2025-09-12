"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// Default avatar placeholder
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230066ff'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

// Handle avatar image errors
const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.target as HTMLImageElement;
  if (target.src !== DEFAULT_AVATAR) {
    target.src = DEFAULT_AVATAR;
  }
};

// Get user avatar with fallback
const getUserAvatar = (user: any) => {
  if (!user) return DEFAULT_AVATAR;

  // If user has an avatar URL, use it
  if (user.avatarUrl) return user.avatarUrl;
  
  // Otherwise, return default avatar
  return DEFAULT_AVATAR;
};

type Room = { 
  id: string; 
  name: string | null; 
  type: 'room' | 'dm'; // Added type to distinguish between rooms and direct messages
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  avatar?: string;
  isOnline?: boolean; // For DMs, show if user is online
  members?: number; // For rooms, show member count
};

type Message = { 
  id: string; 
  content: string; 
  sender?: { 
    username?: string | null; 
    walletAddress?: string | null;
    avatar?: string;
    isVerified?: boolean; // Web3 verification badge
  };
  timestamp?: string;
  reactions?: { emoji: string; count: number; reacted: boolean }[]; // Message reactions
  isOptimistic?: boolean; // For optimistic updates
  readStatus?: {
    sent: boolean; // Single tick - message sent
    delivered: boolean; // Double tick - message delivered
    read: boolean; // Double tick blue - message read
    readBy?: { userId: string; username: string; readAt: string }[]; // Who read the message
  };
};

type User = {
  id: string;
  username?: string | null;
  walletAddress?: string | null;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
};

export default function ChatWidget() {
  const { connected, publicKey } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [showNewRoomForm, setShowNewRoomForm] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'rooms' | 'people'>('rooms'); // Added tab for switching between rooms and people
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isTyping, setIsTyping] = useState(false); // Show typing indicator
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showGifSearch, setShowGifSearch] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [gifResults, setGifResults] = useState<any[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());
  const [chatCache, setChatCache] = useState<{ data: any; timestamp: number } | null>(null);
  const CACHE_DURATION = 60000; // 60 seconds
  const [lastActivityUpdate, setLastActivityUpdate] = useState<number>(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageCache, setMessageCache] = useState<{ [roomId: string]: Message[] }>({});
  const [loadingOldMessages, setLoadingOldMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState<{ [roomId: string]: boolean }>({});
  const [readStatuses, setReadStatuses] = useState<{ [messageId: string]: any }>({});
  const [switchingChat, setSwitchingChat] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    import("@/lib/api").then(({ apiFetch }) =>
      apiFetch("/auth/me").then((r) => r.json()).then((d) => setUser(d.user ?? null)).catch(() => {})
    );
  }, []);

  // Socket connection - single connection for all chat types
  useEffect(() => {
    if (connected && user && !socket) {
      console.log('Creating socket connection...');
      
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
        auth: {
          userId: user.id,
          walletAddress: user.walletAddress
        },
        transports: ['websocket'], // Use only websocket for better performance
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: false
      });

      newSocket.on('connect', () => {
        console.log('Connected to chat server');
        setSocket(newSocket);
        
        // Join the current active room if any
        if (activeRoom && user) {
          newSocket.emit('joinRoom', { 
            roomId: activeRoom, 
            userId: user.id,
            roomType: activeRoom.startsWith('dm-') ? 'dm' : 'room'
          });
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from chat server:', reason);
        setSocket(null);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      // Message handling for all chat types
      newSocket.on('message', (message: Message) => {
        console.log('Received message via socket:', message);
        console.log('Current active room:', activeRoom);
        
        // Update messages
        setMessages(prev => {
          if (!message?.id) return prev;
          
          // Check if this is a real message (not optimistic)
          if (!message.isOptimistic) {
            // Remove any optimistic messages from the same sender
            const filteredPrev = prev.filter(m => !(m.isOptimistic && m.sender?.username === message.sender?.username));
            
            // Add the real message
            if (filteredPrev.some(m => m.id === message.id)) return filteredPrev;
            console.log('Adding real message to chat');
            const newMessages = [...filteredPrev, message];
            
            // Update cache
            setMessageCache(prevCache => ({ 
              ...prevCache, 
              [activeRoom as string]: newMessages.slice(-15) 
            }));
            
            return newMessages;
          }
          
          // Handle optimistic message replacement
          const hasOptimistic = prev.some(m => m.isOptimistic);
          if (hasOptimistic) {
            // Remove optimistic messages and add real one
            console.log('Replacing optimistic message with real one');
            const newMessages = [...prev.filter(m => !m.isOptimistic), message];
            
            // Update cache
            setMessageCache(prevCache => ({ 
              ...prevCache, 
              [activeRoom as string]: newMessages.slice(-15) 
            }));
            
            return newMessages;
          }
          
          // Regular deduplication
          if (prev.some(m => m.id === message.id)) return prev;
          console.log('Adding new message to chat');
          const newMessages = [...prev, message];
          
          // Update cache
          setMessageCache(prevCache => ({ 
            ...prevCache, 
            [activeRoom as string]: newMessages.slice(-15) 
          }));
          
          return newMessages;
        });
        
        // Update chat list with new message info
        if (!message.isOptimistic) {
          setRooms(prev => {
            const updatedRooms = prev.map(room => {
              // Find the room this message belongs to (this is a bit tricky without roomId in message)
              // For now, we'll update based on the current active room
              if (room.id === activeRoom) {
                return {
                  ...room,
                  lastMessage: message.content,
                  lastMessageTime: 'now'
                };
              }
              return room;
            });
            
            // Move the updated room to the top
            const updatedRoom = updatedRooms.find(room => room.id === activeRoom);
            const otherRooms = updatedRooms.filter(room => room.id !== activeRoom);
            
            return updatedRoom ? [updatedRoom, ...otherRooms] : updatedRooms;
          });
        }
      });

      // Typing indicators
      newSocket.on('typing', (data: { roomId: string; user: string; isTyping: boolean }) => {
        if (data.roomId === activeRoom) {
          setIsTyping(data.isTyping);
        }
      });

      // Reaction updates
      newSocket.on('reactionUpdate', (data: { messageId: string; reaction: any }) => {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            if (data.reaction.removed) {
              return {
                ...msg,
                reactions: (msg.reactions || []).filter(r => 
                  !(r.emoji === data.reaction.emoji && r.reacted)
                )
              };
            } else {
              const existingReaction = (msg.reactions || []).find(r => 
                r.emoji === data.reaction.emoji
              );
              
              if (existingReaction) {
                return {
                  ...msg,
                  reactions: (msg.reactions || []).map(r => 
                    r.emoji === data.reaction.emoji 
                      ? { ...r, count: r.count + (data.reaction.userId === user?.id ? 1 : 0), reacted: data.reaction.userId === user?.id || r.reacted } 
                      : r
                  )
                };
              } else {
                return {
                  ...msg,
                  reactions: [...(msg.reactions || []), { 
                    emoji: data.reaction.emoji, 
                    count: 1, 
                    reacted: data.reaction.userId === user?.id 
                  }]
                };
              }
            }
          }
          return msg;
        }));
      });

      // Read receipt updates
      newSocket.on('readReceipt', (data: { messageId: string; userId: string; username: string; readAt: string }) => {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            const currentReadBy = msg.readStatus?.readBy || [];
            const existingRead = currentReadBy.find(r => r.userId === data.userId);
            
            if (!existingRead) {
              return {
                ...msg,
                readStatus: {
                  sent: msg.readStatus?.sent || false,
                  delivered: true,
                  read: true,
                  readBy: [...currentReadBy, {
                    userId: data.userId,
                    username: data.username,
                    readAt: data.readAt
                  }]
                }
              };
            }
          }
          return msg;
        }));
      });

      // Follow updates
      newSocket.on('followUpdate', (data: { userId: string; action: string; success: boolean; error?: string }) => {
        if (data.success) {
          // Update search results
          setSearchResults(prev => 
            prev.map(user => 
              user.id === data.userId 
                ? { ...user, isFollowing: data.action === 'follow' }
                : user
            )
          );
        } else {
          console.error('Follow update failed:', data.error);
          // Revert optimistic update on error
          setSearchResults(prev => 
            prev.map(user => 
              user.id === data.userId 
                ? { ...user, isFollowing: data.action === 'unfollow' }
                : user
            )
          );
        }
      });

      return () => {
        console.log('Cleaning up socket connection...');
        newSocket.close();
        setSocket(null);
      };
    }
  }, [connected, user]);

  // Mark messages as read when user views them
  useEffect(() => {
    if (!activeRoom || !user || messages.length === 0) return;

    // Get unread messages (not sent by current user and not read by current user)
    const unreadMessages = messages.filter(msg => 
      msg.sender?.walletAddress !== user.walletAddress && 
      !msg.readStatus?.readBy?.some(r => r.userId === user.id)
    );

    if (unreadMessages.length > 0) {
      // Mark messages as read after a short delay to ensure user actually saw them
      const timer = setTimeout(() => {
        const messageIds = unreadMessages.map(msg => msg.id);
        markMessagesAsRead(messageIds);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [messages, activeRoom, user]);

  useEffect(() => {
    if (!open) return;
    
    setLoadingRooms(true);
    
    // Load unified chats (rooms + users) from single endpoint
    import("@/lib/api").then(({ apiFetch }) =>
      apiFetch("/chat/chats").then((r) => r.json()).then((data) => {
        const apiRooms = data.rooms ?? [];
        const apiUsers = data.users ?? [];
        
        // Transform rooms
        const transformedRooms: Room[] = apiRooms.map((room: any, index: number) => {
          let avatar = "💬";
          const roomName = (room.name || "").toLowerCase();
          
          if (roomName.includes("general") || roomName.includes("main")) {
            avatar = "🏠";
          } else if (roomName.includes("trading") || roomName.includes("crypto")) {
            avatar = "📈";
          } else if (roomName.includes("tech") || roomName.includes("dev")) {
            avatar = "⚙️";
          } else if (roomName.includes("help") || roomName.includes("support")) {
            avatar = "🆘";
          } else if (roomName.includes("announcement") || roomName.includes("news")) {
            avatar = "📢";
          } else {
            const avatars = ["💬", "🗨️", "💭", "🎯", "🚀", "⭐", "🔥", "💎"];
            avatar = avatars[index % avatars.length];
          }
          
          return {
            id: room.id,
            name: room.name || "Unnamed Room",
            type: 'room' as const,
            lastMessage: room.lastMessage || "No messages yet",
            lastMessageTime: room.updatedAt ? new Date(room.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "now",
            unreadCount: room.unreadCount || 0,
            avatar: avatar,
            members: room.memberCount || 0
          };
        });
        
        // Transform users to DM format with conversation history
        const transformedUsers: Room[] = apiUsers.map((user: any) => ({
          id: `dm-${user.id}`,
          name: user.username || user.displayName || `${user.walletAddress?.slice(0,4)}...${user.walletAddress?.slice(-4)}`,
          type: 'dm' as const,
          lastMessage: user.lastMessage || "No messages yet",
          lastMessageTime: user.lastMessageTime ? new Date(user.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "never",
          unreadCount: 0,
          avatar: user.avatarUrl || getUserAvatar(user),
          isOnline: false, // We don't have real-time online status yet
          conversationId: user.conversationId,
          hasConversation: user.hasConversation
        }));
        
        // Combine rooms and users into one list
        const combinedList: Room[] = [...transformedRooms, ...transformedUsers];
        
        // Sort by recent activity (last message time)
        const sortedList = combinedList.sort((a, b) => {
          const timeA = new Date(a.lastMessageTime === 'now' ? Date.now() : a.lastMessageTime === 'never' ? 0 : (a.lastMessageTime || 0)).getTime();
          const timeB = new Date(b.lastMessageTime === 'now' ? Date.now() : b.lastMessageTime === 'never' ? 0 : (b.lastMessageTime || 0)).getTime();
          return timeB - timeA; // Most recent first
        });
        
        setRooms(sortedList);
        setLoadingRooms(false);
        
        // Set active room to L4 Community if available, otherwise first available
        if (sortedList.length > 0) {
          const l4Room = sortedList.find(room => room.id === 'l4-community');
          if (l4Room) {
            setActiveRoom('l4-community');
          } else {
            setActiveRoom(sortedList[0].id);
          }
        }
      }).catch((error) => {
        console.error("Failed to load chats from API:", error);
        setLoadingRooms(false);
        // Set fallback L4 Community room
        setRooms([{
          id: "l4-community",
          name: "L4 Community",
          type: 'room' as const,
          lastMessage: "Welcome to Layer4! 🚀",
          lastMessageTime: "now",
          unreadCount: 0,
          avatar: "🏠",
          members: 150
        }]);
        setActiveRoom("l4-community");
      })
    );
  }, [open]);

  useEffect(() => {
    if (!activeRoom || !socket || !user) return;
    
    console.log('Joining room:', activeRoom);
    
    // Join room via socket for all chat types
    socket.emit('joinRoom', { 
      roomId: activeRoom, 
      userId: user.id,
      roomType: activeRoom.startsWith('dm-') ? 'dm' : 'room'
    });
    
    if (activeRoom === "l4-community") {
      // Show welcome messages for L4 Community
      setMessages([
        {
          id: "welcome-1",
          content: "Welcome to Layer4 Community! 🚀",
          sender: { 
            username: "Layer4 Bot", 
            walletAddress: null,
            isVerified: true
          },
          timestamp: new Date().toISOString(),
          reactions: []
        },
        {
          id: "welcome-2", 
          content: "This is where the Layer4 community comes together to discuss the future of financial stability.",
          sender: { 
            username: "Layer4 Bot", 
            walletAddress: null,
            isVerified: true
          },
          timestamp: new Date().toISOString(),
          reactions: []
        }
      ]);
    } else {
      // Load messages from API for both rooms and DMs
      const messageEndpoint = activeRoom.startsWith('dm-') 
        ? `/chat/rooms/${activeRoom}/messages` 
        : `/chat/rooms/${activeRoom}/messages`;
        
      import("@/lib/api").then(({ apiFetch }) =>
         apiFetch(messageEndpoint).then((r) => r.json()).then((d) => {
          const apiMessages = d.messages ?? [];
          
          const transformedMessages: Message[] = apiMessages.map((msg: any) => ({
            id: msg.id,
            content: msg.content || "",
            sender: {
              username: msg.sender?.username || msg.sender?.displayName || null,
              walletAddress: msg.sender?.walletAddress || null,
              avatar: msg.sender?.avatarUrl || DEFAULT_AVATAR,
              isVerified: !!msg.sender?.walletAddress
            },
            timestamp: msg.createdAt || new Date().toISOString(),
            reactions: msg.reactions || [],
            readStatus: {
              sent: true,
              delivered: true,
              read: false,
              readBy: msg.reads || []
            }
          }));
          
          setMessages(transformedMessages);
          setSwitchingChat(false);
        }).catch((error) => {
          console.error("Failed to load messages:", error);
          setMessages([]); // Clear messages on error for better UX
          setSwitchingChat(false);
        })
      );
    }
  }, [activeRoom, socket, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Filter chats based on search query
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesSearch = room.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           room.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [rooms, searchQuery]);

  const canShow = useMemo(() => connected, [connected]);

  async function createRoom() {
    if (!newRoom.trim()) return;
    try {
      const { apiFetch } = await import("@/lib/api");
      const r = await apiFetch("/chat/rooms", { 
        method: "POST", 
        body: JSON.stringify({ name: newRoom }) 
      });
      const d = await r.json();
      
        const transformedRoom: Room = {
          id: d.room.id,
          name: d.room.name || newRoom,
          type: 'room' as const,
          lastMessage: "No messages yet",
          lastMessageTime: "now",
          unreadCount: 0,
          avatar: "💬",
          members: 1
        };
      
      setRooms((prev) => [transformedRoom, ...prev]);
      setNewRoom("");
      setShowNewRoomForm(false);
      setActiveRoom(transformedRoom.id);
    } catch (error) {
      console.error("Failed to create room:", error);
        const localRoom: Room = {
          id: `room-${Date.now()}`,
          name: newRoom,
          type: 'room' as const,
          lastMessage: "No messages yet",
          lastMessageTime: "now",
          unreadCount: 0,
          avatar: "💬",
          members: 1
        };
      setRooms((prev) => [localRoom, ...prev]);
      setNewRoom("");
      setShowNewRoomForm(false);
      setActiveRoom(localRoom.id);
    }
  }

  // Profanity filter function
  const profanityWords = [
    'fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'crap', 'piss', 'dick', 'cock',
    'pussy', 'whore', 'slut', 'bastard', 'motherfucker', 'fucking', 'shitty',
    'bullshit', 'fucked', 'fucker', 'fucking', 'shitty', 'asshole', 'dickhead'
  ];

  const filterProfanity = (text: string) => {
    let filteredText = text;
    profanityWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    });
    return filteredText;
  };

  async function sendMessage() {
    if (!activeRoom || (!text.trim() && !selectedImage)) return;
    
    let messageContent = filterProfanity(text);
    
    // Handle image upload
    if (selectedImage) {
      const imageUrl = await uploadImage(selectedImage);
      if (imageUrl) {
        messageContent = text ? `${text}\n![Image](${imageUrl})` : `![Image](${imageUrl})`;
      } else {
        toast.error("Failed to upload image. Please try again.");
        return;
      }
    }
    
    // Create optimistic message immediately
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      sender: {
        username: user?.username || (user as any)?.displayName || "Anonymous",
        walletAddress: user?.walletAddress || "",
        avatar: getUserAvatar(user),
        isVerified: !!user?.walletAddress
      },
      timestamp: new Date().toISOString(),
      reactions: [],
      isOptimistic: true,
      readStatus: {
        sent: true,
        delivered: false,
        read: false,
        readBy: []
      }
    };
    
    // Add optimistic message immediately
    setMessages(prev => {
      const newMessages = [...prev, optimisticMessage];
      // Update cache
      setMessageCache(prevCache => ({ 
        ...prevCache, 
        [activeRoom]: newMessages.slice(-15) 
      }));
      return newMessages;
    });
    
    // Clear inputs immediately
    setText("");
    setSelectedImage(null);
    setImagePreview(null);
    
    // Send via socket for all chat types
    if (socket) {
      console.log('Sending message via socket:', { roomId: activeRoom, content: messageContent });
      
      socket.emit('sendMessage', {
        roomId: activeRoom,
        content: messageContent,
        roomType: activeRoom.startsWith('dm-') ? 'dm' : 'room',
        sender: {
          id: user?.id,
          username: user?.username || (user as any)?.displayName || "Anonymous",
          walletAddress: user?.walletAddress,
          avatar: getUserAvatar(user),
          isVerified: !!user?.walletAddress
        }
      });
    } else {
      // Fallback to API
      try {
        const { apiFetch } = await import("@/lib/api");
        await apiFetch(`/chat/rooms/${activeRoom}/messages`, { 
          method: "POST", 
          body: JSON.stringify({ content: messageContent }) 
        });
      } catch (error) {
        console.error("Failed to send message:", error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        toast.error("Failed to send message. Please try again.");
        return;
      }
    }
    
    // Update room's last message and move to top
    setRooms(prev => {
      const updatedRooms = prev.map(room => 
        room.id === activeRoom 
          ? { ...room, lastMessage: messageContent, lastMessageTime: 'now' }
          : room
      );
      
      // Move the updated room to the top
      const updatedRoom = updatedRooms.find(room => room.id === activeRoom);
      const otherRooms = updatedRooms.filter(room => room.id !== activeRoom);
      
      return updatedRoom ? [updatedRoom, ...otherRooms] : updatedRooms;
    });
  }

  function insertAtCursor(snippet: string) {
    setText((prev) => (prev ? prev + " " + snippet : snippet));
  }

  // Load older messages for infinite scroll
  const loadOldMessages = async () => {
    if (!activeRoom || loadingOldMessages || !hasMoreMessages[activeRoom]) return;
    
    setLoadingOldMessages(true);
    
    try {
      const { apiFetch } = await import("@/lib/api");
      const response = await apiFetch(`/chat/rooms/${activeRoom}/messages?before=${messages[0]?.id || ''}`);
      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        const transformedOldMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content || "",
          sender: {
            username: msg.sender?.username || msg.sender?.displayName || null,
            walletAddress: msg.sender?.walletAddress || null,
            avatar: msg.sender?.avatarUrl || DEFAULT_AVATAR,
            isVerified: !!msg.sender?.walletAddress
          },
          timestamp: msg.createdAt || new Date().toISOString(),
          reactions: msg.reactions || [],
          readStatus: {
            sent: true,
            delivered: true,
            read: false,
            readBy: msg.reads || []
          }
        }));
        
        const newMessages = [...transformedOldMessages, ...messages];
        setMessages(newMessages);
        setMessageCache(prev => ({ ...prev, [activeRoom]: newMessages.slice(-15) }));
        setHasMoreMessages(prev => ({ ...prev, [activeRoom]: data.messages.length === 20 }));
      } else {
        setHasMoreMessages(prev => ({ ...prev, [activeRoom]: false }));
      }
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setLoadingOldMessages(false);
    }
  };

  // Mark messages as read and emit read receipts
  const markMessagesAsRead = (messageIds: string[]) => {
    if (!socket || !user || messageIds.length === 0) return;

    messageIds.forEach(messageId => {
      // Emit read receipt via socket
      socket.emit('markAsRead', {
        messageId,
        userId: user.id,
        username: user.username || (user as any).displayName || 'Anonymous',
        readAt: new Date().toISOString()
      });

      // Update local state optimistically
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const currentReadBy = msg.readStatus?.readBy || [];
          const alreadyRead = currentReadBy.some(r => r.userId === user.id);
          
          if (!alreadyRead) {
              return {
                ...msg,
                readStatus: {
                  sent: msg.readStatus?.sent || false,
                  delivered: true,
                  read: true,
                  readBy: [...currentReadBy, {
                    userId: user.id,
                    username: user.username || (user as any).displayName || 'Anonymous',
                    readAt: new Date().toISOString()
                  }]
                }
              };
          }
        }
        return msg;
      }));
    });
  };

  // Search for users
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { apiFetch } = await import("@/lib/api");
      const response = await apiFetch(`/chat/search-users?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (error) {
      console.error("Failed to search users:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Follow/unfollow user
  const toggleFollow = async (userId: string, isFollowing: boolean) => {
    setFollowLoading(prev => new Set(prev).add(userId));
    
    try {
      // Use socket for faster response if available
      if (socket) {
        socket.emit('toggleFollow', { 
          userId, 
          action: isFollowing ? 'unfollow' : 'follow' 
        });
        
        // Optimistically update UI
        setSearchResults(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, isFollowing: !isFollowing }
              : user
          )
        );
      } else {
        // Fallback to API
        const { apiFetch } = await import("@/lib/api");
        const endpoint = isFollowing ? `/chat/follow/${userId}` : `/chat/follow/${userId}`;
        const method = isFollowing ? 'DELETE' : 'POST';
        
        await apiFetch(endpoint, { method });
        
        // Update search results
        setSearchResults(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, isFollowing: !isFollowing }
              : user
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error);
      // Revert optimistic update on error
      setSearchResults(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, isFollowing: isFollowing }
            : user
        )
      );
    } finally {
      setFollowLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Start conversation with user
  const startConversation = async (userId: string) => {
    const dmId = `dm-${userId}`;
    setSwitchingChat(true);
    
    // Find the user in search results to add to chat list
    const userToAdd = searchResults.find(user => user.id === userId);
    if (userToAdd) {
      // Add user to rooms list if not already there
      const userRoom: Room = {
        id: dmId,
        name: userToAdd.username || userToAdd.displayName || `${userToAdd.walletAddress?.slice(0,4)}...${userToAdd.walletAddress?.slice(-4)}`,
        type: 'dm' as const,
        lastMessage: "No messages yet",
        lastMessageTime: "never",
        unreadCount: 0,
        avatar: userToAdd.avatarUrl || getUserAvatar(userToAdd),
        isOnline: false
      };
      
      // Add to rooms if not already present
      setRooms(prev => {
        const exists = prev.some(room => room.id === dmId);
        if (!exists) {
          return [userRoom, ...prev];
        }
        return prev;
      });
    }
    
    setActiveRoom(dmId);
    setShowUserSearch(false);
    setUserSearchQuery("");
    setSearchResults([]);
    
    // Join the room via socket to receive real-time messages
    if (socket && user) {
      socket.emit('joinRoom', { 
        roomId: dmId, 
        userId: user.id,
        roomType: 'dm'
      });
    }
  };

  // Image upload functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const { apiFetch } = await import("@/lib/api");
      const response = await apiFetch('/chat/upload-image', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Failed to upload image:', error);
      return null;
    }
  };

  // GIF search functions
  const searchGifs = async (query: string) => {
    if (!query.trim()) return;
    
    try {
      const response = await fetch(`https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=20`);
      const data = await response.json();
      setGifResults(data.results || []);
    } catch (error) {
      console.error('Failed to search GIFs:', error);
    }
  };

  const selectGif = (gif: any) => {
    const gifUrl = gif.media[0].gif.url;
    insertAtCursor(`![GIF](${gifUrl})`);
    setShowGifSearch(false);
    setGifSearchQuery("");
    setGifResults([]);
  };

  // Add reaction to message
  const addReaction = async (messageId: string, emoji: string) => {
    if (!user || !activeRoom) return;
    
    // Send via socket if available
    if (socket) {
      socket.emit('addReaction', {
        messageId,
        emoji,
        userId: user.id,
        roomId: activeRoom
      });
    } else {
      // Fallback to API
      try {
        const { apiFetch } = await import("@/lib/api");
        await apiFetch(`/chat/messages/${messageId}/reactions`, {
          method: "POST",
          body: JSON.stringify({ emoji })
        });
      } catch (error) {
        console.log("Reactions API not available, skipping:", error);
      }
    }
  };

  // Show user profile
  const showProfile = async () => {
    if (activeRoom) {
      const active = rooms.find(r => r.id === activeRoom);
      if (active?.type === 'dm') {
        // For DM, fetch user info from API
        const userId = activeRoom.replace('dm-', '');
        try {
          const { apiFetch } = await import("@/lib/api");
          const response = await apiFetch(`/auth/user/${userId}`);
          const userData = await response.json();
          
          const userInfo = {
            id: userId,
            username: userData.username || userData.displayName || active.name,
            displayName: userData.displayName,
            avatar: userData.avatarUrl || active.avatar,
            joinDate: userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown',
            walletAddress: userData.walletAddress || 'Unknown',
            bio: userData.bio,
            isOnline: active.isOnline,
            isFollowing: userData.isFollowing || false
          };
          setSelectedUser(userInfo);
          setShowUserProfile(true);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          // Fallback to room data
          const userInfo = {
            id: userId,
            username: active.name,
            avatar: active.avatar,
            joinDate: 'Unknown',
            walletAddress: 'Unknown',
            isOnline: active.isOnline,
            isFollowing: false
          };
          setSelectedUser(userInfo);
          setShowUserProfile(true);
        }
      } else {
        // For group chats, show current user profile
        const currentUserInfo = {
          ...user,
          joinDate: (user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString() : 'Unknown',
          isOnline: true
        };
        setSelectedUser(currentUserInfo);
        setShowUserProfile(true);
      }
    }
  };

  if (!canShow) return null;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            aria-label="Open chat"
            className="fixed bottom-4 right-4 z-40 rounded-full shadow-lg border-2 border-[#808080] bg-[#0000ff] text-white w-14 h-14 flex items-center justify-center hover:opacity-90 transition-all duration-200"
          >
            <motion.div
              animate={{ 
                y: [0, -5, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.418 16.97 20 12 20C10.88 20 9.84 19.81 8.9 19.48L3 21L4.52 15.1C4.19 14.16 4 13.12 4 12C4 7.582 8.03 4 12 4C16.97 4 21 7.582 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3
            }}
            className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 z-40 w-full h-full md:w-[680px] md:h-[720px] md:max-h-[90vh]"
          >
            <motion.div 
              className="bg-white border border-gray-200 rounded-xl md:rounded-2xl shadow-2xl h-full flex flex-col overflow-hidden backdrop-blur-sm bg-white/95"
              initial={{ borderRadius: "50%" }}
              animate={{ borderRadius: "12px" }}
              transition={{ duration: 0.3 }}
            >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg md:text-xl font-bold shadow-lg">
                  💬
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-lg text-gray-800">Layer4 Chat</h3>
                  <span className="text-xs md:text-sm text-gray-500 hidden md:block">Connect with the community</span>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <button 
                  onClick={() => setShowUserSearch(true)}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 touch-manipulation shadow-sm hover:shadow-md"
                  title="Find people to chat with"
                >
                  <svg width="16" height="16" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button 
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 active:bg-red-100 transition-all duration-200 touch-manipulation shadow-sm hover:shadow-md"
                  title="Close chat"
                >
                  <svg width="16" height="16" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* New Room Form */}
            {showNewRoomForm && (
              <div className="p-4 border-b border-[#808080] bg-[#f8f9fa]">
                <div className="flex gap-2">
                  <input 
                    value={newRoom} 
                    onChange={(e) => setNewRoom(e.target.value)} 
                    placeholder="Enter room name" 
                    className="flex-1 px-3 py-2 border border-[#808080] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0000ff]"
                    onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                  />
                  <button 
                    onClick={createRoom} 
                    className="px-4 py-2 bg-[#0000ff] text-white rounded text-sm hover:bg-[#0000cc] transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-1 overflow-hidden relative">
              {/* Mobile sidebar toggle button */}
              <button 
                className="md:hidden absolute top-2 left-2 z-20 p-2 rounded-full bg-white border border-gray-300 shadow-lg touch-manipulation"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Mobile overlay */}
              {showSidebar && (
                <div 
                  className="md:hidden absolute inset-0 bg-black/20 z-10"
                  onClick={() => setShowSidebar(false)}
                />
              )}
              
              {/* Sidebar - Rooms & People */}
              <div className={`absolute md:relative z-10 md:z-0 md:translate-x-0 transition-all duration-300 ease-in-out w-80 md:w-1/3 min-w-[280px] md:min-w-[240px] md:max-w-[320px] border-r border-gray-200 bg-gradient-to-b from-gray-50 to-white flex flex-col h-full ${
                showSidebar || !activeRoom ? 'translate-x-0' : '-translate-x-full'
              } md:flex`}>
                {/* Search */}
                <div className="p-4 border-b border-gray-100 bg-white">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search chats..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation bg-gray-50 focus:bg-white transition-all duration-200"
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Room/People List */}
                <div className="flex-1 overflow-y-auto">
                  {loadingRooms ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin w-6 h-6 border-2 border-[#0000ff] border-t-transparent rounded-full mx-auto mb-2"></div>
                      Loading...
                    </div>
                  ) : filteredRooms.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-sm">No chats found</p>
                      <button 
                        onClick={() => setShowUserSearch(true)}
                        className="mt-2 text-[#0000ff] text-sm hover:underline"
                      >
                        Message someone ?
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredRooms.map((room) => (
                        <RoomItem 
                          key={room.id} 
                          room={room} 
                          isActive={activeRoom === room.id}
                          onClick={() => {
                            setSwitchingChat(true);
                            setActiveRoom(room.id);
                            
                            // Join socket room for real-time messages
                            if (socket && user) {
                              socket.emit('joinRoom', { 
                                roomId: room.id, 
                                userId: user.id,
                                roomType: room.type
                              });
                            }
                            
                            // Hide sidebar on mobile after selecting a room
                            if (window.innerWidth < 768) {
                              setShowSidebar(false);
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 flex flex-col">
                {activeRoom ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 md:p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                      <div className="flex items-center gap-3 md:gap-4">
                        {(() => {
                          const active = rooms.find(r => r.id === activeRoom);
                          const isDm = active?.type === 'dm';
                          const avatar = active?.avatar;
                          const isImage = typeof avatar === 'string' && /^(data:|https?:)/.test(avatar);
                          return (
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white text-sm md:text-lg font-bold bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden shadow-lg">
                              {isDm && isImage ? (
                                <img
                                  src={avatar as string}
                                  alt={active?.name || 'User'}
                                  className="w-full h-full object-cover"
                                  onError={handleAvatarError}
                                />
                              ) : (
                                <span>{avatar || '💬'}</span>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {rooms.find(r => r.id === activeRoom)?.name}
                            {rooms.find(r => r.id === activeRoom)?.type === 'dm' && rooms.find(r => r.id === activeRoom)?.isOnline && (
                              <span className="ml-2 text-green-500 text-xs">● Online</span>
                            )}
                          </h4>
                          {rooms.find(r => r.id === activeRoom)?.type === 'room' && (
                            <span className="text-xs text-gray-500">
                              {rooms.find(r => r.id === activeRoom)?.members} members
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {/* <button className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-[#808080] flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation" title="Call">
                            <svg width="14" height="14" className="md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M15.5 11.5C15.5 13.9853 13.4853 16 11 16C8.51472 16 6.5 13.9853 6.5 11.5C6.5 9.01472 8.51472 7 11 7C13.4853 7 15.5 9.01472 15.5 11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 15.5C18.5 18.5376 16.0376 21 13 21H9C5.96243 21 3.5 18.5376 3.5 15.5V7.5C3.5 4.46243 5.96243 2 9 2H13C16.0376 2 18.5 4.46243 18.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button> */}
                          <button 
                            onClick={showProfile}
                            className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-[#808080] flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation" 
                            title="User Profile"
                          >
                            <svg width="14" height="14" className="md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div 
                      className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-white"
                      onScroll={(e) => {
                        const element = e.target as HTMLDivElement;
                        if (element.scrollTop === 0 && hasMoreMessages[activeRoom] && !loadingOldMessages) {
                          loadOldMessages();
                        }
                      }}
                    >
                      {loadingOldMessages && (
                        <div className="text-center py-2">
                          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                            Loading older messages...
                          </div>
                        </div>
                      )}
                      {switchingChat && (
                        <div className="flex justify-center items-center py-8">
                          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                      )}
                        {!switchingChat && messages.map((message) => {
                          const isOwnMessage = message.sender?.walletAddress === publicKey?.toString() || message.sender?.username === "You";
                          return (
                           <div key={message.id}>
                             <MessageBubble 
                               message={message} 
                               onReaction={(emoji) => addReaction(message.id, emoji)}
                               currentUserWallet={publicKey?.toString()}
                             />
                             <ReadStatusIndicator 
                               message={message} 
                               isGroupChat={activeRoom === 'l4-community'} 
                               isOwnMessage={isOwnMessage}
                             />
                           </div>
                          );
                        })}
                      <div ref={messagesEndRef} />
                      {isTyping && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#0000ff] rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="bg-gray-100 rounded-lg p-3">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                      {/* Image Preview */}
                      {imagePreview && (
                        <div className="p-4 border-t border-[#808080] bg-gray-50">
                          <div className="flex items-center gap-3">
                            <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded border" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-600">Image ready to send</p>
                              <p className="text-xs text-gray-500">{selectedImage?.name}</p>
                            </div>
                            <button 
                              onClick={() => {
                                setSelectedImage(null);
                                setImagePreview(null);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}

                      {/* GIF Search */}
                      {showGifSearch && (
                        <div className="p-4 border-t border-[#808080] bg-gray-50 max-h-64 overflow-y-auto">
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              placeholder="Search GIFs..."
                              value={gifSearchQuery}
                              onChange={(e) => setGifSearchQuery(e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-[#808080] rounded focus:outline-none focus:ring-1 focus:ring-[#0000ff]"
                              onKeyPress={(e) => e.key === 'Enter' && searchGifs(gifSearchQuery)}
                            />
                            <button
                              onClick={() => searchGifs(gifSearchQuery)}
                              className="px-4 py-2 bg-[#0000ff] text-white rounded text-sm hover:bg-[#0000cc]"
                            >
                              Search
                            </button>
                            <button
                              onClick={() => {
                                setShowGifSearch(false);
                                setGifSearchQuery("");
                                setGifResults([]);
                              }}
                              className="px-4 py-2 border border-[#808080] rounded text-sm hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {gifResults.map((gif, index) => (
                              <button
                                key={index}
                                onClick={() => selectGif(gif)}
                                className="aspect-square rounded border hover:border-[#0000ff] overflow-hidden"
                              >
                                <img 
                                  src={gif.media[0].tinygif.url} 
                                  alt={gif.content_description}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message Input */}
                      <div className="p-4 md:p-6 border-t border-gray-100 bg-gradient-to-r from-white to-gray-50">
                       {/* Media and Emoji Buttons */}
                       <div className="flex flex-wrap gap-2 mb-3">
                         <button
                           onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                           className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                           title="Add emoji"
                         >
                           😀
                         </button>
                         <button
                           onClick={() => fileInputRef.current?.click()}
                           className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                           title="Add image"
                         >
                           📷
                         </button>
                         {/* <button
                           onClick={() => insertAtCursor('🎉')}
                           className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                           title="Add GIF"
                         >
                           🎬
                         </button> */}
                       </div>

                       {/* Emoji Picker */}
                       {showEmojiPicker && (
                         <div className="mb-3 p-3 border border-gray-200 rounded-xl bg-white shadow-lg">
                           <div className="grid grid-cols-8 gap-2">
                             {['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '💯', '🎉', '👏', '🙌'].map(emoji => (
                               <button
                                 key={emoji}
                                 onClick={() => {
                                   insertAtCursor(emoji);
                                   setShowEmojiPicker(false);
                                 }}
                                 className="w-8 h-8 text-lg hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                               >
                                 {emoji}
                               </button>
                             ))}
                           </div>
                         </div>
                       )}
                       
                       <input
                         type="file"
                         ref={fileInputRef}
                         onChange={handleImageUpload}
                         accept="image/*"
                         className="hidden"
                       />
                      <div className="flex gap-2 md:gap-3">
                        <div className="flex-1 relative">
                          <textarea 
                            value={text} 
                            onChange={(e) => setText(e.target.value)} 
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation bg-white shadow-sm transition-all duration-200" 
                            rows={1}
                            placeholder="Type a message..."
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                              }
                            }}
                            style={{ minHeight: '40px', maxHeight: '120px' }}
                          />
                          {text && (
                            <div className="absolute right-2 md:right-3 top-2 md:top-3 flex gap-1">
                              <button 
                                className="text-gray-400 hover:text-[#0000ff] active:text-[#0000cc] transition-colors touch-manipulation"
                                onClick={() => setText('')}
                              >
                                <svg width="14" height="14" className="md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                         <button 
                           onClick={sendMessage} 
                           disabled={(!text.trim() && !selectedImage)}
                           className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center touch-manipulation min-w-[48px] shadow-lg hover:shadow-xl disabled:shadow-none"
                         >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 bg-white">
                    <div className="text-center">
                      <div className="text-6xl mb-4">💬</div>
                      <p className="text-lg font-medium">Select a room or person to start chatting</p>
                      <p className="text-sm text-gray-500 mt-2">Create a new room or search for someone to message</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white border-2 border-[#808080] rounded-lg p-4 md:p-6 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg md:text-xl font-semibold">Find People to Chat With</h3>
              <button 
                onClick={() => {
                  setShowUserSearch(false);
                  setUserSearchQuery("");
                  setSearchResults([]);
                }}
                className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-[#808080] flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
              >
                <svg width="14" height="14" className="md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by username, display name, or wallet address..."
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="w-full px-3 py-2 border border-[#808080] rounded focus:outline-none focus:ring-2 focus:ring-[#0000ff] touch-manipulation text-sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {searchLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-[#0000ff] border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Searching...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {userSearchQuery.length < 2 ? (
                    <p className="text-sm">Type at least 2 characters to search</p>
                  ) : (
                    <p className="text-sm">No users found</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border border-[#808080] rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-[#0000ff] to-[#0066ff] flex items-center justify-center text-white text-xs md:text-sm font-bold overflow-hidden flex-shrink-0">
                          {user.avatarUrl ? (
                            <img 
                              src={user.avatarUrl} 
                              alt={user.username || user.displayName} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                                ((e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement)!.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <span style={{ display: user.avatarUrl ? 'none' : 'block' }}>
                            {(user.username || user.displayName || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {user.username || user.displayName || 'Anonymous'}
                          </h4>
                          <p className="text-xs text-gray-500 truncate">
                            {user.walletAddress ? `${user.walletAddress.slice(0,4)}...${user.walletAddress.slice(-4)}` : 'No wallet'}
                          </p>
                          {user.bio && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{user.bio}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                        <button
                          onClick={() => startConversation(user.id)}
                          className="px-2 md:px-3 py-1 bg-[#0000ff] text-white text-xs rounded hover:bg-[#0000cc] active:bg-[#000099] transition-colors touch-manipulation"
                        >
                          Message
                        </button>
                        <button
                          onClick={() => toggleFollow(user.id, user.isFollowing)}
                          disabled={followLoading.has(user.id)}
                          className={`px-2 md:px-3 py-1 text-xs rounded border transition-colors flex items-center gap-1 touch-manipulation ${
                            user.isFollowing 
                              ? 'border-red-300 text-red-600 hover:bg-red-50 active:bg-red-100' 
                              : 'border-[#808080] text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                          } ${followLoading.has(user.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {followLoading.has(user.id) ? (
                            <>
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                              <span className="hidden md:inline">Loading...</span>
                            </>
                          ) : (
                            <span className="hidden md:inline">{user.isFollowing ? 'Unfollow' : 'Follow'}</span>
                          )}
                          <span className="md:hidden">{user.isFollowing ? '−' : '+'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showUserProfile && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-md bg-white border-2 border-[#808080] rounded-lg p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">User Profile</h3>
              <button 
                onClick={() => {
                  setShowUserProfile(false);
                  setSelectedUser(null);
                }}
                className="w-8 h-8 rounded-full border border-[#808080] flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className="text-center">
              {/* Avatar */}
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#0000ff] to-[#0066ff] flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                {selectedUser.avatar && typeof selectedUser.avatar === 'string' && /^(data:|https?:)/.test(selectedUser.avatar) ? (
                  <img 
                    src={selectedUser.avatar} 
                    alt={selectedUser.username || 'User'} 
                    className="w-full h-full object-cover"
                    onError={handleAvatarError}
                  />
                ) : (
                  <span>{(selectedUser.username || selectedUser.displayName || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
              
              {/* User Info */}
              <h4 className="text-xl font-bold text-gray-800 mb-2">
                {selectedUser.username || selectedUser.displayName || 'Anonymous'}
              </h4>
              
              {selectedUser.walletAddress && (
                <p className="text-sm text-gray-600 mb-4 font-mono">
                  {selectedUser.walletAddress.slice(0,6)}...{selectedUser.walletAddress.slice(-4)}
                </p>
              )}
              
              {/* Status */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className={`w-3 h-3 rounded-full ${selectedUser.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">
                  {selectedUser.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {/* Profile Details */}
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Join Date</span>
                  <span className="text-sm text-gray-800">
                    {selectedUser.joinDate || 'Unknown'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">User ID</span>
                  <span className="text-sm text-gray-800 font-mono">
                    {selectedUser.id?.slice(0,8)}...
                  </span>
                </div>
                
                {selectedUser.bio && (
                  <div className="py-2">
                    <span className="text-sm font-medium text-gray-600 block mb-1">Bio</span>
                    <p className="text-sm text-gray-800">{selectedUser.bio}</p>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => {
                    if (activeRoom?.startsWith('dm-')) {
                      // Already in DM, just close profile
                      setShowUserProfile(false);
                    } else {
                      // Start DM conversation
                      const userId = selectedUser.id;
                      if (userId) {
                        startConversation(userId);
                        setShowUserProfile(false);
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-[#0000ff] text-white rounded-lg hover:bg-[#0000cc] active:bg-[#000099] transition-colors"
                >
                  {activeRoom?.startsWith('dm-') ? 'Close' : 'Message'}
                </button>
                
                <button 
                  onClick={() => {
                    // Follow/Unfollow functionality
                    if (selectedUser.id !== user?.id) {
                      toggleFollow(selectedUser.id, selectedUser.isFollowing || false);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedUser.isFollowing 
                      ? 'border-red-300 text-red-600 hover:bg-red-50' 
                      : 'border-[#808080] text-gray-600 hover:bg-gray-50'
                  }`}
                  disabled={selectedUser.id === user?.id}
                >
                  {selectedUser.id === user?.id ? 'You' : (selectedUser.isFollowing ? 'Unfollow' : 'Follow')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </>
  );
}

// Read status indicator component
function ReadStatusIndicator({ message, isGroupChat, isOwnMessage }: { message: Message; isGroupChat: boolean; isOwnMessage: boolean }) {
  if (!message.readStatus || !isOwnMessage) return null;

  const { sent, delivered, read, readBy } = message.readStatus;

  if (isGroupChat) {
    // For group chats, show "seen by X" or "seen by 23" etc.
    if (read && readBy && readBy.length > 0) {
      return (
        <div className="text-xs text-gray-500 mt-1">
          Seen by {readBy.length}
        </div>
      );
    }
  } else {
    // For DMs, show "seen" instead of double ticks for sender
    if (read && readBy && readBy.length > 0) {
      return (
        <div className="text-xs text-blue-500 mt-1">
          Seen
        </div>
      );
    } else if (delivered) {
      return (
        <div className="text-xs text-gray-400 mt-1">
          Delivered
        </div>
      );
    } else if (sent) {
      return (
        <div className="text-xs text-gray-400 mt-1">
          Sent
        </div>
      );
    }
  }

  return null;
}

function RoomItem({ room, isActive, onClick }: { room: Room; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 touch-manipulation group ${
        isActive ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500 shadow-sm' : ''
      }`}
    >
      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative flex-shrink-0">
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white text-sm md:text-lg font-bold shadow-lg ${
            room.type === 'dm' && room.isOnline 
              ? 'bg-gradient-to-br from-green-500 to-green-600' 
              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          }`}>
            {room.avatar ? (
              <img 
                src={room.avatar} 
                alt={room.name || "User"} 
                className="w-full h-full rounded-xl object-cover"
                onError={handleAvatarError}
              />
            ) : (
              room.type === 'dm' ? '👤' : '💬'
            )}
          </div>
          {room.type === 'dm' && room.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 mb-1">
            <h4 className="font-semibold text-sm md:text-base truncate text-gray-800 group-hover:text-blue-600 transition-colors">{room.name}</h4>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              room.type === 'dm' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {room.type === 'dm' ? 'DM' : 'Room'}
            </span>
            {room.unreadCount && room.unreadCount > 0 && (
              <div className="w-5 h-5 md:w-6 md:h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0 font-bold shadow-sm">
                {room.unreadCount > 99 ? '99+' : room.unreadCount}
              </div>
            )}
            {room.type === 'room' && room.members && (
              <span className="text-xs text-gray-400 hidden md:inline font-medium">({room.members})</span>
            )}
          </div>
          <p className="text-xs md:text-sm text-gray-600 truncate mb-2 leading-relaxed">
            {room.lastMessage || (room.type === 'dm' ? 'No messages yet' : 'No recent messages')}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">
              {room.lastMessageTime === 'now' ? 'now' : room.lastMessageTime === 'never' ? 'never' : room.lastMessageTime}
            </span>
            {room.type === 'dm' && room.isOnline && (
              <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Online
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message, onReaction, currentUserWallet }: { message: Message; onReaction: (emoji: string) => void; currentUserWallet?: string | null }) {
  const author = message.sender?.username || (message.sender?.walletAddress ? `${message.sender.walletAddress.slice(0,4)}…${message.sender.walletAddress.slice(-4)}` : "");
  const parts = parseContent(message.content || "");
  const isBot = message.sender?.username === "Layer4 Bot";
  const isOwnMessage = !isBot && (message.sender?.walletAddress === currentUserWallet || message.sender?.username === "You");
  
  // Common reaction emojis
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  
  return (
    <div className={`flex gap-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {!isOwnMessage && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-r from-[#0000ff] to-[#0066ff] flex-shrink-0">
          <img 
            src={getUserAvatar(message.sender)} 
            alt={author} 
            className="w-full h-full rounded-full object-cover" 
            onError={handleAvatarError}
          />
        </div>
      )}
      <div className={`max-w-[85%] ${isOwnMessage ? 'bg-[#0000ff] text-white' : isBot ? 'bg-gray-100' : 'bg-gray-50'} rounded-2xl p-4 relative group`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-medium ${isOwnMessage ? 'text-blue-100' : isBot ? 'text-gray-700' : 'text-gray-800'}`}>
            {author}
            {message.sender?.isVerified && !isBot && (
              <span className="ml-1 text-xs" title="Verified wallet">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-text-top">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.97 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </span>
          {message.timestamp && (
            <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {parts.map((p, i) => {
            if (p.type === 'image') return <div key={i} className="my-2 max-w-full"><img src={p.url} alt="img" className="max-w-full rounded-lg border border-gray-200 shadow-sm" onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23cccccc"%3E%3Cpath d="M8.5 13.5l2.5 3 3.5-4.5 4.5 6H5m16-12V18a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2z"/%3E%3C/svg%3E';
            }}/></div>;
            if (p.type === 'link') return <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className={`underline break-all hover:opacity-80 ${isOwnMessage ? 'text-blue-100 hover:text-blue-50' : 'text-[#0000ff] hover:text-[#0000cc]'}`}>{p.label || p.url}</a>;
            return <span key={i}>{p.text}</span>;
          })}
        </div>
        
        {/* Reactions */}
        {(message.reactions && message.reactions.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.map((reaction, idx) => (
              <button
                key={idx}
                onClick={() => onReaction(reaction.emoji)}
                className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 transition-colors ${
                  isOwnMessage 
                    ? 'bg-blue-600 text-white hover:bg-blue-500' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } ${reaction.reacted ? (isOwnMessage ? 'bg-blue-400' : 'bg-gray-300') : ''}`}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
        
        {/* Reaction picker (hidden by default, shows on hover for desktop, always visible on mobile) */}
        <div className={`absolute bottom-2 right-2 transition-opacity flex gap-1 ${
          isOwnMessage ? 'left-2 right-auto' : ''
        } md:opacity-0 md:group-hover:opacity-100 ${
          isOwnMessage ? 'md:left-2 md:right-auto' : ''
        }`}>
          {reactionEmojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => onReaction(emoji)}
              className="w-6 h-6 text-xs rounded-full bg-white bg-opacity-90 text-gray-700 hover:bg-opacity-100 hover:scale-110 transition-all flex items-center justify-center shadow-sm"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      {isOwnMessage && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-r from-[#0000ff] to-[#0066ff] flex-shrink-0">
          <img 
            src={getUserAvatar(message.sender)} 
            alt={author} 
            className="w-full h-full rounded-full object-cover" 
            onError={handleAvatarError}
          />
        </div>
      )}
    </div>
  );
}

function parseContent(input: string): Array<any> {
  const tokens: Array<any> = [];
  
  // Handle markdown-style links and images: [text](url) and ![alt](url)
  const markdownRegex = /(!?)\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = markdownRegex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: input.slice(lastIndex, match.index) });
    }
    
    const isImage = match[1] === '!';
    const label = match[2];
    const url = match[3];
    
    if (isImage) {
      tokens.push({ type: 'image', url, alt: label });
    } else {
      tokens.push({ type: 'link', url, label });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Handle plain URLs
  if (lastIndex < input.length) {
    const remainingText = input.slice(lastIndex);
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    let urlMatch: RegExpExecArray | null;
    let urlLastIndex = 0;
    
    while ((urlMatch = urlRegex.exec(remainingText)) !== null) {
      if (urlMatch.index > urlLastIndex) {
        tokens.push({ type: 'text', text: remainingText.slice(urlLastIndex, urlMatch.index) });
      }
      
      const url = urlMatch[0];
      if (/\.(png|jpe?g|webp|gif)$/i.test(url)) {
        tokens.push({ type: 'image', url });
      } else {
        tokens.push({ type: 'link', url });
      }
      
      urlLastIndex = urlMatch.index + url.length;
    }
    
    if (urlLastIndex < remainingText.length) {
      tokens.push({ type: 'text', text: remainingText.slice(urlLastIndex) });
    }
  }
  
  return tokens;
}