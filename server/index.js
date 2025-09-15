// Load environment variables
require('dotenv').config({ path: '.env.local' });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
const msgpack = require('msgpack-lite');
const next = require('next');
// const jwt = require('jsonwebtoken'); // Not needed for session-based auth
const { prisma } = require('./lib/prisma');

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const stakingRoutes = require('./routes/staking');
const postsRoutes = require('./routes/posts');
const dextoolsRoutes = require('./routes/dextools');

// Next.js setup
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

// Simple in-memory storage for development (replace with Redis in production)
const memoryStore = {
  connections: new Map(),
  typingUsers: new Map(),
  userPresence: new Map()
};

// Use memory store for connections
const connections = memoryStore.connections;

// Event types
const CLIENT_EVENTS = {
  SEND_MESSAGE: 'SEND_MESSAGE',
  EDIT_MESSAGE: 'EDIT_MESSAGE',
  DELETE_MESSAGE: 'DELETE_MESSAGE',
  ADD_REACTION: 'ADD_REACTION',
  REMOVE_REACTION: 'REMOVE_REACTION',
  START_TYPING: 'START_TYPING',
  STOP_TYPING: 'STOP_TYPING',
  FETCH_MESSAGES: 'FETCH_MESSAGES',
  JOIN_CHANNEL: 'JOIN_CHANNEL',
  LEAVE_CHANNEL: 'LEAVE_CHANNEL',
  UPLOAD_MEDIA: 'UPLOAD_MEDIA',
  MARK_AS_READ: 'MARK_AS_READ',
  PING: 'PING'
};

const SERVER_EVENTS = {
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  MESSAGE_EDITED: 'MESSAGE_EDITED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  REACTION_ADDED: 'REACTION_ADDED',
  REACTION_REMOVED: 'REACTION_REMOVED',
  TYPING_STARTED: 'TYPING_STARTED',
  TYPING_STOPPED: 'TYPING_STOPPED',
  USER_JOINED: 'USER_JOINED',
  USER_LEFT: 'USER_LEFT',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  READ_RECEIPT_UPDATED: 'READ_RECEIPT_UPDATED',
  MEDIA_UPLOADED: 'MEDIA_UPLOADED',
  MESSAGES_LOADED: 'MESSAGES_LOADED',
  CHANNEL_CREATED: 'CHANNEL_CREATED',
  NEW_DM_INVITE: 'NEW_DM_INVITE',
  PONG: 'PONG'
};

// Helper functions
async function broadcastToChannel(channelId, event, payload, excludeUserId = null) {
  const message = msgpack.encode([event, payload, Date.now()]);
  
  try {
    const members = await prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true }
    });
    
    console.log(`📡 [SERVER] Broadcasting ${event} to channel ${channelId}:`, {
      totalMembers: members.length,
      excludeUserId,
      event,
      timestamp: new Date().toISOString()
    });
    
    let sentCount = 0;
    const sendPromises = [];
    
    members.forEach(member => {
      // Include sender for real-time display (excludeUserId is null for messages)
      if (member.userId !== excludeUserId) {
        const ws = connections.get(member.userId);
        if (ws && ws.readyState === 1) {
          try {
            ws.send(message);
            sentCount++;
            console.log(`✅ [SERVER] Message sent to user ${member.userId}`);
          } catch (error) {
            console.log(`⚠️ [SERVER] Error sending to user ${member.userId}:`, error.message);
          }
        } else {
          console.log(`⚠️ [SERVER] User ${member.userId} not connected (readyState: ${ws?.readyState})`);
        }
      }
    });
    
    // console.log(`✅ [SERVER] Broadcast complete:`, {
    //   sentTo: sentCount,
    //   totalMembers: members.length,
    //   channelId,
    //   event,
    //   successRate: `${Math.round((sentCount / members.length) * 100)}%`
    // });
  } catch (error) {
    console.error('❌ Error broadcasting to channel:', error);
  }
}

async function updateUserPresence(userId, status) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        status,
        lastSeen: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating user presence:', error);
  }
}

// Initialize Next.js and start server
nextApp.prepare().then(() => {
  // Express app setup
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Serve static files
  app.use('/uploads', express.static('public/uploads'));
  app.use('/avatars', express.static('public/avatars'));

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/staking', stakingRoutes);
  app.use('/api/posts', postsRoutes);
  app.use('/api/dextools', dextoolsRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // All other requests handled by Next.js
  app.use((req, res) => {
    return handle(req, res);
  });

  // WebSocket event handlers
async function handleSendMessage(userId, payload) {
  try {
    const { channelId, content, attachments = [], repliedToMessageId } = payload;
    
    console.log(`📤 [SERVER] User ${userId} sending message to channel ${channelId}:`, {
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      attachments: attachments?.length || 0,
      repliedToMessageId,
      timestamp: new Date().toISOString()
    });
    
    // Ensure user is a member of the channel
    const existingMember = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId, userId }
      }
    });
    console.log('existingMember', existingMember);
    if (!existingMember) {
      console.log(`👥 [SERVER] Adding user ${userId} as member of channel ${channelId}`);
      await prisma.channelMember.create({
        data: { channelId, userId }
      });
      console.log(`✅ [SERVER] User ${userId} added to channel ${channelId}`);
    } else {
      console.log(`✅ [SERVER] User ${userId} already member of channel ${channelId}`);
    }
    
    // Create message in database
    const message = await prisma.message.create({
      data: {
        channelId,
        authorId: userId,
        content,
        attachments: attachments || [],
        repliedToMessageId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            walletAddress: true
          }
        },
        repliedToMessage: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                walletAddress: true
              }
            }
          }
        }
      }
    });

    console.log(`✅ [SERVER] Message created in database:`, {
      messageId: message.id,
      channelId: message.channelId,
      authorId: message.authorId,
      content: message.content.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });

    // Broadcast to channel members (including sender for real-time display)
    await broadcastToChannel(channelId, SERVER_EVENTS.MESSAGE_RECEIVED, message, null);
    
    console.log(`📡 [SERVER] Message broadcasted to channel ${channelId} members:`, {
      messageId: message.id,
      channelId,
      broadcastTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error sending message:', error);
  }
}

async function handleJoinChannel(userId, payload) {
  try {
    const { channelId } = payload;
    
    // Check if user is already a member
    const existingMember = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId, userId }
      }
    });

    if (!existingMember) {
      // Add user to channel
      await prisma.channelMember.create({
        data: { channelId, userId }
      });
    }

    // Broadcast user joined event
    await broadcastToChannel(channelId, SERVER_EVENTS.USER_JOINED, { userId, channelId }, userId);
  } catch (error) {
    console.error('Error joining channel:', error);
  }
}

async function handleStartTyping(userId, payload) {
  try {
    const { channelId } = payload;
    await broadcastToChannel(channelId, SERVER_EVENTS.TYPING_STARTED, { userId, channelId }, userId);
  } catch (error) {
    console.error('Error handling typing start:', error);
  }
}

async function handleStopTyping(userId, payload) {
  try {
    const { channelId } = payload;
    await broadcastToChannel(channelId, SERVER_EVENTS.TYPING_STOPPED, { userId, channelId }, userId);
  } catch (error) {
    console.error('Error handling typing stop:', error);
  }
}

async function handleFetchMessages(userId, payload, ws) {
  try {
    const { channelId, limit = 50, before } = payload;
    
    console.log('📚 [SERVER] Fetching messages:', {
      channelId,
      limit,
      before,
      userId
    });
    
    // Ensure user is member of channel
    const membership = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId
        }
      }
    });

    if (!membership) {
      // Check if this is a DM channel and if it already has 2 members
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: {
          _count: {
            select: { members: true }
          }
        }
      });
      
      if (channel?.type === 'dm' && channel._count.members >= 2) {
        console.error('❌ [DM VALIDATION] Cannot add member to DM channel via WebSocket: already has 2 members', {
          channelId,
          currentMemberCount: channel._count.members,
          userId
        });
        return; // Don't add the user and don't fetch messages
      }
      
      console.log('👥 [SERVER] Auto-adding user to channel for message fetch');
      await prisma.channelMember.create({
        data: { channelId, userId }
      });
    }

    // Fetch latest messages (most recent first, then reverse for display)
    const messages = await prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        ...(before && { sentAt: { lt: new Date(before) } })
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            walletAddress: true
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        repliedToMessage: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                walletAddress: true
              }
            }
          }
        }
      },
      orderBy: { sentAt: 'desc' }, // Get latest messages first
      take: parseInt(limit)
    });

    // Reverse to show oldest first in UI
    const reversedMessages = messages.reverse();

    console.log(`✅ [SERVER] Fetched ${reversedMessages.length} messages for channel ${channelId}`);

    // Send messages to user
    ws.send(msgpack.encode([SERVER_EVENTS.MESSAGES_LOADED, {
      channelId,
      messages: reversedMessages
    }, Date.now()]));

  } catch (error) {
    console.error('❌ [SERVER] Error fetching messages:', error);
  }
}

async function handleMarkAsRead(userId, payload) {
  try {
    const { messageId } = payload;
    
    console.log('👁️ [SERVER] Marking message as read:', {
      messageId,
      userId
    });

    // Create read receipt
    await prisma.readReceipt.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId
        }
      },
      update: {
        readAt: new Date()
      },
      create: {
        messageId,
        userId,
        readAt: new Date()
      }
    });

    console.log(`✅ [SERVER] Message ${messageId} marked as read by user ${userId}`);

  } catch (error) {
    console.error('❌ [SERVER] Error marking message as read:', error);
  }
}

  // WebSocket server setup
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws, req) => {
  try {
    console.log('🔌 [SERVER] New WebSocket connection attempt:', {
      url: req.url,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.log('❌ [SERVER] WebSocket connection rejected: No authentication token');
      ws.close(1008, 'No authentication token provided');
      return;
    }

    // Use session-based auth like the rest of the backend
    const session = await prisma.session.findUnique({ 
      where: { token }, 
      include: { user: true } 
    });
    
    if (!session || session.expiresAt < new Date()) {
      console.log('❌ [SERVER] WebSocket connection rejected: Invalid or expired token');
      ws.close(1008, 'Invalid or expired token');
      return;
    }

    const userId = session.userId;
    const username = session.user.username || session.user.walletAddress;

    console.log('🔐 [SERVER] WebSocket authentication successful:', {
      userId,
      username,
      token: token.substring(0, 10) + '...',
      expiresAt: session.expiresAt
    });

    connections.set(userId, ws);
    await updateUserPresence(userId, 'online');
    
    console.log('✅ [SERVER] WebSocket connected for user:', {
      userId,
      username,
      totalConnections: connections.size,
      timestamp: new Date().toISOString()
    });
    
    // Send connection success message
    ws.send(msgpack.encode([SERVER_EVENTS.USER_STATUS_CHANGED, { 
      userId, 
      status: 'online' 
    }, Date.now()]));

    ws.on('message', async (data) => {
      try {
        const [eventType, payload] = msgpack.decode(data);
        // console.log('🔵 [SERVER] WebSocket message received:', {
        //   eventType,
        //   payload: payload ? JSON.stringify(payload).substring(0, 100) + '...' : 'null',
        //   userId,
        //   timestamp: new Date().toISOString()
        // });
        
        switch (eventType) {
          case CLIENT_EVENTS.SEND_MESSAGE:
            // console.log('📨 [SERVER] Processing SEND_MESSAGE:', {
            //   channelId: payload?.channelId,
            //   content: payload?.content?.substring(0, 50) + '...',
            //   authorId: payload?.authorId,
            //   userId
            // });
            await handleSendMessage(userId, payload);
            break;
          case CLIENT_EVENTS.JOIN_CHANNEL:
            // console.log('🚪 [SERVER] Processing JOIN_CHANNEL:', { channelId: payload?.channelId, userId });
            await handleJoinChannel(userId, payload);
            break;
          case CLIENT_EVENTS.START_TYPING:
            // console.log('✍️ [SERVER] Processing START_TYPING:', { channelId: payload?.channelId, userId });
            await handleStartTyping(userId, payload);
            break;
          case CLIENT_EVENTS.STOP_TYPING:
            // console.log('⏹️ [SERVER] Processing STOP_TYPING:', { channelId: payload?.channelId, userId });
            await handleStopTyping(userId, payload);
            break;
          case CLIENT_EVENTS.FETCH_MESSAGES:
            console.log('📚 [SERVER] Processing FETCH_MESSAGES:', { channelId: payload?.channelId, userId });
            await handleFetchMessages(userId, payload, ws);
            break;
          case CLIENT_EVENTS.MARK_AS_READ:
            console.log('👁️ [SERVER] Processing MARK_AS_READ:', { messageId: payload?.messageId, userId });
            await handleMarkAsRead(userId, payload);
            break;
          case CLIENT_EVENTS.PING:
            ws.send(msgpack.encode([SERVER_EVENTS.PONG, {}, Date.now()]));
            break;
          default:
            console.log('Unknown event type:', eventType);
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    ws.on('close', (code, reason) => {
      // console.log('🔌 [SERVER] WebSocket disconnected:', {
      //   userId,
      //   username,
      //   code,
      //   reason: reason.toString(),
      //   totalConnections: connections.size - 1,
      //   timestamp: new Date().toISOString()
      // });
      connections.delete(userId);
      updateUserPresence(userId, 'offline');
    });

    ws.on('error', (error) => {
      // console.error('❌ [SERVER] WebSocket error:', {
      //   userId,
      //   username,
      //   error: error.message,
      //   stack: error.stack,
      //   timestamp: new Date().toISOString()
      // });
      connections.delete(userId);
      updateUserPresence(userId, 'offline');
    });

    } catch (error) {
      console.error('Connection error:', error);
      ws.close(1008, 'Authentication failed');
    }
  });

  const port = process.env.EXPRESS_PORT || 3001;
  server.listen(port, () => {
    console.log('🚀 [SERVER] Express server started:', {
      port,
      apiUrl: `http://localhost:${port}/api`,
      websocketUrl: `ws://localhost:${port}`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  process.on('SIGINT', async () => {
    console.log('Shutting down WebSocket server...');
    await prisma.$disconnect();
    process.exit(0);
  });
}); 