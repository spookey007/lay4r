const chatService = require('../services/chatService');
const { prisma } = require('./prisma');
const ChatController = require('../controllers/chatController');

class SocketManager {
  constructor(io) {
    this.io = io;
    this.setupConnectionHandler();
  }

  setupConnectionHandler() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Handle joining a room
      socket.on('joinRoom', async (data) => {
        const { roomId, userId, roomType } = data;
        
        // Only allow specific rooms: l4-community and DM rooms
        const allowedRooms = ['l4-community'];
        const isDMRoom = roomId.startsWith('dm-');
        
        if (!allowedRooms.includes(roomId) && !isDMRoom) {
          console.log(`User ${userId} attempted to join unauthorized room: ${roomId}`);
          socket.emit('error', { message: 'Unauthorized room access' });
          return;
        }
        
        // Leave previous rooms to avoid multiple subscriptions
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
        
        // Join the new room
        socket.join(roomId);
        console.log(`User ${userId} joined ${roomType || 'room'} ${roomId}`);
        
        // For DM rooms, also join the actual conversation room
        if (isDMRoom) {
          const recipientId = roomId.substring(3);
          const recipient = await prisma.user.findUnique({
            where: { id: recipientId },
            select: { id: true }
          });
          
          if (!recipient) {
            console.log(`User ${userId} attempted to DM non-existent user: ${recipientId}`);
            socket.emit('error', { message: 'User not found' });
            socket.leave(roomId);
            return;
          }
          
          // Get or create DM conversation and join it
          try {
            const conversation = await chatService.getOrCreateDMConversation(userId, recipientId);
            socket.join(conversation.id);
            console.log(`User ${userId} also joined conversation room ${conversation.id}`);
          } catch (error) {
            console.error('Error creating/joining DM conversation:', error);
          }
        }
      });

      // Handle sending a message
      socket.on('sendMessage', async (data) => {
        try {
          const { roomId, content, sender, roomType } = data;
          
          // Only allow messages to l4-community and DM rooms
          const allowedRooms = ['l4-community'];
          const isDMRoom = roomId.startsWith('dm-');
          
          if (!allowedRooms.includes(roomId) && !isDMRoom) {
            socket.emit('error', { message: 'Unauthorized room access' });
            return;
          }
          
          // Allow messages to l4-community
          
          // Create message data immediately for instant response
          const messageData = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: content,
            sender: {
              username: sender.username,
              walletAddress: sender.walletAddress,
              avatar: sender.avatar,
              isVerified: sender.isVerified
            },
            timestamp: new Date().toISOString(),
            reactions: []
          };

          // Handle DM conversations
          if (isDMRoom) {
            const recipientId = roomId.substring(3);
            
            // Validate recipient exists (cached check)
            const recipient = await prisma.user.findUnique({
              where: { id: recipientId },
              select: { id: true }
            });
            
            if (!recipient) {
              socket.emit('error', { message: 'User not found' });
              return;
            }
            
            // Get or create DM conversation
            const conversation = await chatService.getOrCreateDMConversation(sender.id, recipientId);
            
            // Broadcast to both the dm- room and the actual conversation room
            this.io.to(roomId).emit('message', messageData);
            this.io.to(conversation.id).emit('message', messageData);
            
            // Save message to database in background
            chatService.sendMessage(conversation.id, content, sender.id).catch(error => {
              console.error('Failed to save message to database:', error);
            });
          } else {
            // For regular rooms (including l4-community), broadcast to room and save to database
            this.io.to(roomId).emit('message', messageData);
            
            // Save message to database in background
            chatService.sendMessage(roomId, content, sender.id).catch(error => {
              console.error('Failed to save message to database:', error);
            });
          }
          
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicator
      socket.on('typing', (data) => {
        socket.to(data.roomId).emit('typing', data);
      });

      // Handle adding a reaction
      socket.on('addReaction', async (data) => {
        try {
          const { messageId, emoji, userId, roomId } = data;
          
          // Get user from session token
          const token = socket.handshake.auth?.sessionToken;
          if (!token) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }
          
          const session = await prisma.session.findUnique({ 
            where: { token }, 
            include: { user: true } 
          });
          
          if (!session || session.expiresAt < new Date() || session.user.id !== userId) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }
          
          // Toggle reaction using service
          const reaction = await chatService.toggleMessageReaction(
            messageId,
            userId,
            emoji
          );
          
          // Broadcast reaction update to room
          this.io.to(roomId).emit('reactionUpdate', {
            messageId,
            reaction
          });
        } catch (error) {
          console.error('Error adding reaction:', error);
          socket.emit('error', { message: 'Failed to add reaction' });
        }
      });

      // Handle follow/unfollow operations
      socket.on('toggleFollow', async (data) => {
        try {
          const { userId, action } = data;
          
          // Get user from session token
          const token = socket.handshake.auth?.sessionToken;
          if (!token) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }
          
          const session = await prisma.session.findUnique({ 
            where: { token }, 
            include: { user: true } 
          });
          
          if (!session || session.expiresAt < new Date()) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }
          
          const currentUser = session.user;

          if (action === 'follow') {
            // Check if already following
            const existingFollow = await prisma.follow.findFirst({
              where: {
                followerId: currentUser.id,
                followingId: userId
              }
            });

            if (!existingFollow) {
              await prisma.follow.create({
                data: {
                  followerId: currentUser.id,
                  followingId: userId
                }
              });
            }
          } else if (action === 'unfollow') {
            await prisma.follow.deleteMany({
              where: {
                followerId: currentUser.id,
                followingId: userId
              }
            });
          }

          // Emit success back to client
          socket.emit('followUpdate', {
            userId,
            action,
            success: true
          });

        } catch (error) {
          console.error('Error toggling follow:', error);
          socket.emit('followUpdate', {
            userId: data.userId,
            action: data.action,
            success: false,
            error: 'Failed to update follow status'
          });
        }
      });

      // Handle read receipts
      socket.on('markAsRead', async (data) => {
        try {
          const { messageId, userId, username, readAt } = data;
          
          // Get user from session token
          const token = socket.handshake.auth?.sessionToken;
          if (!token) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }
          
          const session = await prisma.session.findUnique({ 
            where: { token }, 
            include: { user: true } 
          });
          
          if (!session || session.expiresAt < new Date() || session.user.id !== userId) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }

          // Create read receipt in database
          await prisma.messageRead.upsert({
            where: {
              messageId_userId: {
                messageId: messageId,
                userId: userId
              }
            },
            update: {
              readAt: new Date(readAt)
            },
            create: {
              messageId: messageId,
              userId: userId,
              readAt: new Date(readAt)
            }
          });

          // Broadcast read receipt to all users in the room
          const message = await prisma.message.findUnique({
            where: { id: messageId },
            include: { room: true, conversation: true }
          });

          if (message) {
            const roomId = message.roomId || message.conversationId;
            if (roomId) {
              this.io.to(roomId).emit('readReceipt', {
                messageId,
                userId,
                username,
                readAt
              });
            }
          }
        } catch (error) {
          console.error('Error handling read receipt:', error);
          socket.emit('error', { message: 'Failed to mark message as read' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }
}

module.exports = SocketManager;