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

// Database connection initialization
async function initializeDatabase() {
  try {
    console.log('🔌 [DATABASE] Initializing database connection...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ [DATABASE] Database connected successfully');
    
    // Test a simple query to ensure database is working
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ [DATABASE] Database query test successful');
    
    return true;
  } catch (error) {
    console.error('❌ [DATABASE] Failed to connect to database:', error);
    console.error('❌ [DATABASE] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    return false;
  }
}

// Database health check
async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('❌ [DATABASE] Health check failed:', error);
    return { 
      status: 'unhealthy', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    };
  }
}

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const stakingRoutes = require('./routes/staking');
const postsRoutes = require('./routes/posts');
const dextoolsRoutes = require('./routes/dextools');

// Next.js setup
const dev = process.env.NODE_ENV !== 'production';
console.log('🔧 [SERVER] Next.js mode:', dev ? 'development' : 'production');
const nextApp = next({ dev, dir: process.cwd() });
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
  PONG: 'PONG',
  ERROR: 'ERROR' // ← Added ERROR event type
};

// Helper functions
async function broadcastToChannel(channelId, event, payload, excludeUserId = null) {
  const message = msgpack.encode([event, payload, Date.now()]);
  
  try {
    const members = await prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true }
    });
    
    let sentCount = 0;
    
    members.forEach(member => {
      if (member.userId !== excludeUserId) {
        const ws = connections.get(member.userId);
        if (ws && ws.readyState === 1) {
          try {
            ws.send(message);
            sentCount++;
          } catch (error) {
            console.log(`⚠️ [SERVER] Error sending to user ${member.userId}:`, error.message);
          }
        } else {
          console.log(`⚠️ [SERVER] User ${member.userId} not connected (readyState: ${ws?.readyState})`);
        }
      }
    });
    
    console.log(`✅ [SERVER] Broadcast complete:`, {
      sentTo: sentCount,
      totalMembers: members.length,
      channelId,
      event,
      successRate: `${Math.round((sentCount / members.length) * 100)}%`
    });
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

// Initialize server based on environment
// 🚀 START WEBSOCKET SERVER AFTER DATABASE CONNECTION
console.log('🚀 [SERVER] Starting server initialization...');

// Initialize database first, then start server
async function initializeServer() {
  const dbConnected = await initializeDatabase();
  
  if (!dbConnected) {
    console.error('❌ [SERVER] Failed to connect to database. Server will not start.');
    process.exit(1);
  }
  
  console.log('🚀 [SERVER] Starting WebSocket server...');
  startServer();
}

initializeServer();

// 🧩 PREPARE NEXT.JS ASYNCHRONOUSLY — DON'T BLOCK WEBSOCKET
if (!dev) {
  console.log('🧩 [SERVER] Preparing Next.js asynchronously...');
  nextApp.prepare().then(() => {
    console.log('✅ [SERVER] Next.js preparation completed');
  }).catch((error) => {
    console.error('❌ [SERVER] Next.js preparation failed:', error);
  });
}
function startServer() {
  // Express app setup
  const app = express();

  // Middleware
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://socket.lay4r.io",
    "https://lay4r.io",
    "https://demo.lay4r.io",
    "https://api.lay4r.io"
  ];
  
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
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

    // In your Express app setup (inside startServer())
  app.get('/api/ws-health', (req, res) => {
    res.json({
      status: 'ok',
      websocket: {
        connections: connections.size,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    const dbHealth = await checkDatabaseHealth();
    res.json({ 
      status: dbHealth.status === 'healthy' ? 'ok' : 'error',
      database: dbHealth,
      timestamp: new Date().toISOString() 
    });
  });

  // Database health check endpoint
  app.get('/api/health/database', async (req, res) => {
    const dbHealth = await checkDatabaseHealth();
    res.json(dbHealth);
  });

  // All other requests handled by Next.js - only in production
  if (!dev) {
    app.use((req, res) => {
      return handle(req, res);
    });
  } else {
    // In development, just handle API routes and WebSocket
    app.use((req, res) => {
      res.status(404).json({ error: 'Not found - use Next.js dev server on port 3000' });
    });
  }

  // WebSocket event handlers
  async function handleSendMessage(userId, payload) {
    try {
      const { channelId, content, attachments = [], repliedToMessageId } = payload;
      
      const existingMember = await prisma.channelMember.findUnique({
        where: {
          channelId_userId: { channelId, userId }
        }
      });

      if (!existingMember) {
        await prisma.channelMember.create({
          data: { channelId, userId }
        });
      }
      
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

      await broadcastToChannel(channelId, SERVER_EVENTS.MESSAGE_RECEIVED, message, null);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error; // Re-throw to be caught by caller
    }
  }

  async function handleJoinChannel(userId, payload) {
    try {
      const { channelId } = payload;
      
      const existingMember = await prisma.channelMember.findUnique({
        where: {
          channelId_userId: { channelId, userId }
        }
      });

      if (!existingMember) {
        await prisma.channelMember.create({
          data: { channelId, userId }
        });
      }

      await broadcastToChannel(channelId, SERVER_EVENTS.USER_JOINED, { userId, channelId }, userId);
    } catch (error) {
      console.error('Error joining channel:', error);
      throw error;
    }
  }

  async function handleStartTyping(userId, payload) {
    try {
      const { channelId } = payload;
      await broadcastToChannel(channelId, SERVER_EVENTS.TYPING_STARTED, { userId, channelId }, userId);
    } catch (error) {
      console.error('Error handling typing start:', error);
      throw error;
    }
  }

  async function handleStopTyping(userId, payload) {
    try {
      const { channelId } = payload;
      await broadcastToChannel(channelId, SERVER_EVENTS.TYPING_STOPPED, { userId, channelId }, userId);
    } catch (error) {
      console.error('Error handling typing stop:', error);
      throw error;
    }
  }

  async function handleFetchMessages(userId, payload, ws) {
    try {
      const { channelId, limit = 50, before } = payload;
      
      const membership = await prisma.channelMember.findUnique({
        where: {
          channelId_userId: {
            channelId,
            userId
          }
        }
      });

      if (!membership) {
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
          return;
        }
        
        await prisma.channelMember.create({
          data: { channelId, userId }
        });
      }

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
        orderBy: { sentAt: 'desc' },
        take: parseInt(limit)
      });

      const reversedMessages = messages.reverse();

      ws.send(msgpack.encode([SERVER_EVENTS.MESSAGES_LOADED, {
        channelId,
        messages: reversedMessages
      }, Date.now()]));

    } catch (error) {
      console.error('❌ [SERVER] Error fetching messages:', error);
      throw error;
    }
  }

  async function handleMarkAsRead(userId, payload) {
    try {
      const { messageId } = payload;
      
      // Validate that the message exists before creating read receipt
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { id: true, channelId: true }
      });
      
      if (!message) {
        console.log('⚠️ [SERVER] Cannot mark message as read: message not found', {
          messageId,
          userId
        });
        return; // Silently return - don't throw error for non-existent messages
      }
      
      // Check if user has access to the channel containing this message
      const membership = await prisma.channelMember.findUnique({
        where: {
          channelId_userId: {
            channelId: message.channelId,
            userId
          }
        }
      });
      
      if (!membership) {
        console.log('⚠️ [SERVER] Cannot mark message as read: user not member of channel', {
          messageId,
          userId,
          channelId: message.channelId
        });
        return; // Silently return - don't throw error for unauthorized access
      }
      
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
      
      console.log('✅ [SERVER] Message marked as read:', {
        messageId,
        userId,
        channelId: message.channelId
      });
    } catch (error) {
      console.error('❌ [SERVER] Error marking message as read:', error);
      throw error;
    }
  }

  // WebSocket server setup
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('error', (error) => {
    console.error('❌ [SERVER] WebSocket server error:', error);
  });

  wss.on('connection', async (ws, req) => {
    try {
      
      console.log('🔌 [SERVER] New WebSocket connection attempt:', {
        url: req.url,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        headers: req.headers
      });
      
      const url = new URL(req.url, `http://${req.headers.host}`);
      
      // Only allow connections from /?token=<anything> pattern
      const validUrlPattern = /^\/\?token=.+$/;
      if (!validUrlPattern.test(req.url)) {
        console.log('❌ [SERVER] WebSocket connection rejected: Invalid URL pattern', {
          url: req.url,
          expectedPattern: '/?token=<token>'
        });
        ws.close(1008, 'Invalid connection URL pattern');
        return;
      }
      
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.log('❌ [SERVER] WebSocket connection rejected: No authentication token');
        ws.close(1008, 'No authentication token provided');
        return;
      }

      const session = await prisma.session.findUnique({ 
        where: { token }, 
        include: { user: true } 
      });
      
      if (!session || session.expiresAt < new Date()) {
        console.log('❌ [SERVER] WebSocket connection rejected: Invalid or expired token', {
          hasSession: !!session,
          expiresAt: session?.expiresAt,
          currentTime: new Date(),
          token: token.substring(0, 10) + '...'
        });
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

    // Check if user already has a connection
    const existingConnection = connections.get(userId);
    if (existingConnection) {
      console.log('⚠️ [SERVER] User already connected, closing existing connection', {
        userId,
        existingReadyState: existingConnection.readyState
      });
      existingConnection.close(1000, 'Replaced by new connection');
    }

    connections.set(userId, ws);
    await updateUserPresence(userId, 'online');
      
      console.log('✅ [SERVER] WebSocket connected for user:', {
        userId,
        username,
        totalConnections: connections.size,
        timestamp: new Date().toISOString()
      });
      
      ws.send(msgpack.encode([SERVER_EVENTS.USER_STATUS_CHANGED, { 
        userId, 
        status: 'online' 
      }, Date.now()]));

      ws.on('message', async (data) => {
        try {
          const [eventType, payload] = msgpack.decode(data);
          
          console.log('🔵 [SERVER] WebSocket message received:', {
            eventType,
            payload: payload ? JSON.stringify(payload).substring(0, 100) + '...' : 'null',
            userId,
            timestamp: new Date().toISOString()
          });

          switch (eventType) {
            case CLIENT_EVENTS.SEND_MESSAGE:
              try {
                await handleSendMessage(userId, payload);
              } catch (err) {
                console.error('❌ [SERVER] Error in handleSendMessage:', err);
                ws.send(msgpack.encode([SERVER_EVENTS.ERROR, { message: 'Failed to send message' }, Date.now()]));
              }
              break;

            case CLIENT_EVENTS.JOIN_CHANNEL:
              try {
                await handleJoinChannel(userId, payload);
              } catch (err) {
                console.error('❌ [SERVER] Error in handleJoinChannel:', err);
              }
              break;

            case CLIENT_EVENTS.START_TYPING:
              try {
                await handleStartTyping(userId, payload);
              } catch (err) {
                console.error('❌ [SERVER] Error in handleStartTyping:', err);
              }
              break;

            case CLIENT_EVENTS.STOP_TYPING:
              try {
                await handleStopTyping(userId, payload);
              } catch (err) {
                console.error('❌ [SERVER] Error in handleStopTyping:', err);
              }
              break;

            case CLIENT_EVENTS.FETCH_MESSAGES:
              try {
                await handleFetchMessages(userId, payload, ws);
              } catch (err) {
                console.error('❌ [SERVER] Error in handleFetchMessages:', err);
                ws.send(msgpack.encode([SERVER_EVENTS.ERROR, { message: 'Failed to fetch messages' }, Date.now()]));
              }
              break;

            case CLIENT_EVENTS.MARK_AS_READ:
              try {
                await handleMarkAsRead(userId, payload);
              } catch (err) {
                console.error('❌ [SERVER] Error in handleMarkAsRead:', err);
              }
              break;

              case CLIENT_EVENTS.PING:
                try {
                  // Echo back with Layer4 Tek acknowledgment
                  const responsePayload = payload?.protocol === 'LAYER4_TEK' 
                    ? { ...payload, acknowledged: true, serverTime: Date.now() }
                    : payload || {};
              
                  ws.send(msgpack.encode([SERVER_EVENTS.PONG, responsePayload, Date.now()]));
                  console.log('❤️ [SERVER] Layer4 Tek heartbeat acknowledged');
                } catch (err) {
                  console.error('❌ [SERVER] Error sending PONG:', err);
                }
                break;

            default:
              console.log('Unknown event type:', eventType);
          }
        } catch (error) {
          console.error('💥 [SERVER] UNCAUGHT ERROR in ws.on("message"):', error);
          try {
            ws.send(msgpack.encode([SERVER_EVENTS.ERROR, { message: 'Internal server error' }, Date.now()]));
          } catch (e) {
            console.error('Failed to send error to client:', e.message);
          }
        }
      });

      ws.on('close', (code, reason) => {
        console.log('🔌 [SERVER] WebSocket disconnected:', {
          userId,
          username,
          code,
          reason: reason.toString(),
          wasClean: code === 1000,
          totalConnections: connections.size - 1,
          timestamp: new Date().toISOString()
        });
        connections.delete(userId);
        updateUserPresence(userId, 'offline');
      });

      ws.on('error', (error) => {
        console.error('❌ [SERVER] WebSocket error:', {
          userId,
          username,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        connections.delete(userId);
        updateUserPresence(userId, 'offline');
      });

    } catch (error) {
      console.error('💥 [SERVER] Connection error:', error);
      try {
        ws.close(1008, 'Authentication failed');
      } catch (e) {
        console.error('Failed to close WebSocket after auth error:', e.message);
      }
    }
  });

  const port = process.env.EXPRESS_PORT || 3001;
  const host = process.env.HOST || '0.0.0.0'; // ← Changed to 0.0.0.0 for external access
  const protocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';
  const WSS_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
  const domain = process.env.NODE_ENV === 'production' ? process.env.DOMAIN || 'demo.lay4r.io' : `localhost:${port}`;
  
  server.listen(port, host, () => { // ← Added host parameter
    console.log('🚀 [SERVER] Express server started:', {
      port,
      host,
      apiUrl: `${protocol === 'wss' ? 'https' : 'http'}://${domain}/api`,
      websocketUrl: `${WSS_URL}`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Graceful shutdown handling
  const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 [SERVER] Received ${signal}. Starting graceful shutdown...`);
    
    try {
      // Close WebSocket server
      console.log('🔌 [SERVER] Closing WebSocket server...');
      wss.close(() => {
        console.log('✅ [SERVER] WebSocket server closed');
      });
      
      // Close HTTP server
      console.log('🌐 [SERVER] Closing HTTP server...');
      server.close(() => {
        console.log('✅ [SERVER] HTTP server closed');
      });
      
      // Disconnect from database
      console.log('🔌 [DATABASE] Disconnecting from database...');
      await prisma.$disconnect();
      console.log('✅ [DATABASE] Database disconnected');
      
      console.log('✅ [SERVER] Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ [SERVER] Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle different shutdown signals
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('💥 [SERVER] Uncaught Exception:', error);
    await gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 [SERVER] Unhandled Rejection at:', promise, 'reason:', reason);
    await gracefulShutdown('UNHANDLED_REJECTION');
  });
}