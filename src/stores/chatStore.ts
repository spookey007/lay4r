import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface User {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  lastSeen: string;
  isVerified: boolean;
}

export interface Attachment {
  url: string;
  type: 'image' | 'gif' | 'video' | 'file';
  originalName: string;
  size: number;
  thumbnailUrl?: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  attachments: Attachment[];
  repliedToMessageId?: string;
  editedAt?: string;
  deletedAt?: string;
  sentAt: string;
  isSystem: boolean;
  author: User;
  reactions: MessageReaction[];
  readReceipts: ReadReceipt[];
  repliedToMessage?: Message;
  isOptimistic?: boolean; // Flag for optimistic updates
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
  };
}

export interface ReadReceipt {
  id: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface Channel {
  id: string;
  name: string | null;
  type: 'dm' | 'text-group';
  createdBy: string;
  uid?: string | null; // Other user ID for DMs
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
  lastMessageId: string | null;
  topic: string | null;
  members: ChannelMember[];
  uidUser?: User | null; // Other user data for DMs
  lastMessage?: Message;
  messages?: Message[];
  _count: {
    members: number;
  };
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  joinedAt: string;
  user: User;
}

export interface TypingUser {
  userId: string;
  channelId: string;
  timestamp: number;
}

interface ChatState {
  // Channels
  channels: Channel[];
  currentChannelId: string | null;
  
  // Messages
  messages: Record<string, Message[]>; // channelId -> messages
  
  // Users
  users: Record<string, User>; // userId -> user
  currentUser: User | null; // Current authenticated user
  
  // Typing indicators
  typingUsers: Record<string, TypingUser[]>; // channelId -> typing users
  
  // UI state
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  
  // Actions
  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  removeChannel: (channelId: string) => void;
  setCurrentChannel: (channelId: string | null) => void;
  
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  prependMessages: (channelId: string, messages: Message[]) => void;
  
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  setCurrentUser: (user: User | null) => void;
  
  setTypingUsers: (channelId: string, users: TypingUser[]) => void;
  addTypingUser: (channelId: string, user: TypingUser) => void;
  removeTypingUser: (channelId: string, userId: string) => void;
  
  setLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed getters
  getCurrentChannel: () => Channel | null;
  getCurrentMessages: () => Message[];
  getChannelMembers: (channelId: string) => User[];
  getTypingUsers: (channelId: string) => User[];
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      channels: [],
      currentChannelId: null,
      messages: {},
      users: {},
      currentUser: null,
      typingUsers: {},
      isLoading: false,
      isConnected: false,
      error: null,

      // Channel actions
      setChannels: (channels) => set({ channels }),
      
      addChannel: (channel) => set((state) => ({
        channels: [...state.channels, channel]
      })),
      
      updateChannel: (channelId, updates) => set((state) => ({
        channels: state.channels.map(channel =>
          channel.id === channelId ? { ...channel, ...updates } : channel
        )
      })),
      
      removeChannel: (channelId) => set((state) => ({
        channels: state.channels.filter(channel => channel.id !== channelId),
        currentChannelId: state.currentChannelId === channelId ? null : state.currentChannelId
      })),
      
      setCurrentChannel: (channelId) => set({ currentChannelId: channelId }),

      // Message actions
      setMessages: (channelId, messages) => set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: messages
        }
      })),
      
      addMessage: (message) => {

        set((state) => {
          const newMessages = {
            ...state.messages,
            [message.channelId]: [
              ...(state.messages[message.channelId] || []),
              message
            ]
          };

          return { messages: newMessages };
        });
      },
      
      updateMessage: (messageId, updates) => set((state) => {
        const newMessages = { ...state.messages };
        Object.keys(newMessages).forEach(channelId => {
          newMessages[channelId] = newMessages[channelId].map(msg =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          );
        });
        return { messages: newMessages };
      }),
      
      removeMessage: (messageId) => set((state) => {
        const newMessages = { ...state.messages };
        Object.keys(newMessages).forEach(channelId => {
          newMessages[channelId] = newMessages[channelId].filter(msg => msg.id !== messageId);
        });
        return { messages: newMessages };
      }),
      
      prependMessages: (channelId, messages) => set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: [
            ...messages,
            ...(state.messages[channelId] || [])
          ]
        }
      })),

      // User actions
      setUsers: (users) => set((state) => {
        const userMap = users.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<string, User>);
        return { users: { ...state.users, ...userMap } };
      }),
      
      addUser: (user) => set((state) => ({
        users: {
          ...state.users,
          [user.id]: user
        }
      })),
      
      updateUser: (userId, updates) => set((state) => ({
        users: {
          ...state.users,
          [userId]: {
            ...state.users[userId],
            ...updates
          }
        }
      })),
      
      setCurrentUser: (user) => set({ currentUser: user }),

      // Typing actions
      setTypingUsers: (channelId, users) => set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [channelId]: users
        }
      })),
      
      addTypingUser: (channelId, user) => set((state) => {
        const currentTyping = state.typingUsers[channelId] || [];
        const existingIndex = currentTyping.findIndex(u => u.userId === user.userId);
        
        let newTyping;
        if (existingIndex >= 0) {
          newTyping = [...currentTyping];
          newTyping[existingIndex] = user;
        } else {
          newTyping = [...currentTyping, user];
        }
        
        return {
          typingUsers: {
            ...state.typingUsers,
            [channelId]: newTyping
          }
        };
      }),
      
      removeTypingUser: (channelId, userId) => set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [channelId]: (state.typingUsers[channelId] || []).filter(u => u.userId !== userId)
        }
      })),

      // UI actions
      setLoading: (loading) => set({ isLoading: loading }),
      setConnected: (connected) => set({ isConnected: connected }),
      setError: (error) => set({ error }),

      // Computed getters
      getCurrentChannel: () => {
        const state = get();
        return state.channels.find(channel => channel.id === state.currentChannelId) || null;
      },
      
      getCurrentMessages: () => {
        const state = get();
        return state.currentChannelId ? (state.messages[state.currentChannelId] || []) : [];
      },
      
      getChannelMembers: (channelId) => {
        const state = get();
        const channel = state.channels.find(c => c.id === channelId);
        if (!channel) return [];
        
        return channel.members.map(member => member.user);
      },
      
      getTypingUsers: (channelId) => {
        const state = get();
        const typingUsers = state.typingUsers[channelId] || [];
        const now = Date.now();
        
        // Filter out users who haven't typed in the last 3 seconds
        const activeTypingUsers = typingUsers.filter(user => now - user.timestamp < 3000);
        
        // Map to user objects and filter out current user and invalid users
        return activeTypingUsers
          .map(typingUser => state.users[typingUser.userId])
          .filter(Boolean)
          .filter(user => user.id !== state.currentUser?.id); // Don't show current user typing
      }
    }),
    {
      name: 'chat-store'
    }
  )
);
