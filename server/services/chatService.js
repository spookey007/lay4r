const { prisma } = require('../lib/prisma');

class ChatService {
  // Get all rooms
  async getAllRooms() {
    return await prisma.room.findMany({
      orderBy: { updatedAt: 'desc' }
    });
  }

  // Create a new room
  async createRoom(name) {
    // Validate input
    if (!name || typeof name !== 'string') {
      throw new Error('Room name is required and must be a string');
    }
    
    if (name.length > 50) {
      throw new Error('Room name too long. Maximum 50 characters allowed.');
    }
    
    return await prisma.room.create({ data: { name } });
  }

  // Get messages for a specific room
  async getRoomMessages(roomId) {
    // Special handling for l4-community room - now return actual messages
    if (roomId === 'l4-community') {
      // Ensure the L4 Community room exists in the database
      let room = await prisma.room.findUnique({
        where: { id: 'l4-community' }
      });
      
      if (!room) {
        room = await prisma.room.create({
          data: {
            id: 'l4-community',
            name: 'L4 Community',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      
      const messages = await prisma.message.findMany({
        where: { roomId: 'l4-community' },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              walletAddress: true,
              avatarUrl: true,
              avatarBlob: true
            }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: 50
      });
      return messages;
    }
    
    return await prisma.message.findMany({
      where: { roomId },
      include: { sender: true },
      orderBy: { createdAt: 'asc' }
    });
  }

  // Get or create a direct message conversation between two users
  async getOrCreateDMConversation(user1Id, user2Id) {
    // Try to find existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        type: 'dm',
        participants: {
          every: {
            userId: { in: [user1Id, user2Id] }
          }
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: true
          }
        }
      }
    });
    
    // If no conversation exists, create one
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          type: 'dm',
          participants: {
            create: [
              { userId: user1Id },
              { userId: user2Id }
            ]
          }
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              sender: true
            }
          }
        }
      });
    }
    
    return conversation;
  }

  // Send a message to a room or conversation
  async sendMessage(roomId, content, senderId) {
    // Validate input
    if (!content || typeof content !== 'string') {
      throw new Error('Message content is required and must be a string');
    }
    
    if (content.length > 1000) {
      throw new Error('Message content too long. Maximum 1000 characters allowed.');
    }
    
    // Special handling for l4-community room - now allow messages
    if (roomId === 'l4-community') {
      // Ensure the L4 Community room exists in the database
      let room = await prisma.room.findUnique({
        where: { id: 'l4-community' }
      });
      
      if (!room) {
        room = await prisma.room.create({
          data: {
            id: 'l4-community',
            name: 'L4 Community',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      
      const message = await prisma.message.create({
        data: {
          content: content,
          roomId: roomId,
          senderId: senderId
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              walletAddress: true,
              avatarUrl: true,
              avatarBlob: true
            }
          }
        }
      });
      return message;
    }
    
    // Check if it's a conversation (DM) or room
    const isConversation = await prisma.conversation.findUnique({
      where: { id: roomId }
    });
    
    if (isConversation) {
      // Handle conversation message
      const message = await prisma.message.create({
        data: { 
          content, 
          conversationId: roomId, 
          senderId
        }
      });
      
      await prisma.conversation.update({ 
        where: { id: roomId }, 
        data: { updatedAt: new Date() } 
      });
      
      return message;
    } else {
      // Handle room message (legacy support)
      const roomExists = await prisma.room.findUnique({
        where: { id: roomId }
      });
      
      if (!roomExists) {
        throw new Error('Room not found');
      }
      
      const message = await prisma.message.create({
        data: { 
          content, 
          roomId, 
          senderId
        }
      });
      
      await prisma.room.update({ 
        where: { id: roomId }, 
        data: { updatedAt: new Date() } 
      });
      
      return message;
    }
  }

  // Add or remove reaction to a message
  async toggleMessageReaction(messageId, userId, emoji) {
    // Validate input
    if (!emoji || typeof emoji !== 'string') {
      throw new Error('Emoji is required and must be a string');
    }
    
    if (emoji.length > 10) {
      throw new Error('Invalid emoji');
    }
    
    // Check if reaction already exists
    const existingReaction = await prisma.messageReaction.findFirst({
      where: {
        messageId,
        userId,
        emoji
      }
    });
    
    if (existingReaction) {
      // Remove reaction (toggle off)
      await prisma.messageReaction.delete({
        where: { id: existingReaction.id }
      });
      return { removed: true, emoji, userId };
    } else {
      // Add new reaction
      const reaction = await prisma.messageReaction.create({
        data: {
          messageId,
          userId,
          emoji
        }
      });
      return reaction;
    }
  }

  // Get message by ID
  async getMessageById(messageId) {
    return await prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: true }
    });
  }
}

module.exports = new ChatService();