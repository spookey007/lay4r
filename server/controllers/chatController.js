const chatService = require('../services/chatService');
const { prisma } = require('../lib/prisma');

class ChatController {
  // Unified chats endpoint: returns rooms and followed users with conversation history
  async getChats(req, res) {
    try {
      const currentUser = await ChatController.getUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Only return L4 Community room (hardcoded)
      const rooms = [{
        id: 'l4-community',
        name: 'L4 Community',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: 'Welcome to Layer4 Community!',
        lastMessageTime: 'now'
      }];

      // Get followed users and users who follow current user (mutual connections)
      const followedUsers = await prisma.user.findMany({
        where: {
          OR: [
            { followers: { some: { followerId: currentUser.id } } }, // Users who follow current user
            { following: { some: { followingId: currentUser.id } } }  // Users current user follows
          ],
          NOT: { id: currentUser.id }
        },
        select: { 
          id: true, 
          walletAddress: true, 
          username: true, 
          displayName: true, 
          avatarUrl: true 
        }
      });

      // Get existing conversations for each followed user
      const usersWithConversations = await Promise.all(
        followedUsers.map(async (user) => {
          // Find conversation between current user and this user
          const conversation = await prisma.conversation.findFirst({
            where: {
              type: 'dm',
              participants: {
                every: {
                  userId: { in: [currentUser.id, user.id] }
                }
              }
            },
            include: {
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                  sender: {
                    select: { username: true, displayName: true, avatarUrl: true }
                  }
                }
              }
            }
          });

          // If no conversation exists, create one
          let conversationId = conversation?.id;
          if (!conversationId) {
            const newConversation = await prisma.conversation.create({
              data: {
                type: 'dm',
                participants: {
                  create: [
                    { userId: currentUser.id },
                    { userId: user.id }
                  ]
                }
              }
            });
            conversationId = newConversation.id;
          }

          return {
            ...user,
            conversationId,
            lastMessage: conversation?.messages[0]?.content || null,
            lastMessageTime: conversation?.messages[0]?.createdAt || null,
            hasConversation: !!conversation?.messages.length
          };
        })
      );

      // Filter to only show users with existing conversations or mutual follows
      const usersWithHistory = [];
      for (const user of usersWithConversations) {
        if (user.hasConversation) {
          usersWithHistory.push(user);
        } else {
          // Check if there's a mutual follow relationship
          const currentUserFollows = await prisma.follow.findFirst({
            where: {
              followerId: currentUser.id,
              followingId: user.id
            }
          });
          
          const userFollowsCurrent = await prisma.follow.findFirst({
            where: {
              followerId: user.id,
              followingId: currentUser.id
            }
          });
          
          if (currentUserFollows || userFollowsCurrent) {
            usersWithHistory.push(user);
          }
        }
      }

      res.json({ 
        rooms: rooms.map(room => ({
          ...room,
          lastMessage: room.lastMessage || "No messages yet",
          lastMessageTime: room.updatedAt ? new Date(room.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "now"
        })),
        users: usersWithHistory
      });
    } catch (error) {
      console.error('Error fetching chats:', error);
      res.status(500).json({ error: 'Failed to fetch chats' });
    }
  }
  // Get all users for DMs (excluding current user)
  async getUsers(req, res) {
    try {
      const currentUser = await ChatController.getUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const users = await prisma.user.findMany({
        where: {
          NOT: {
            id: currentUser.id
          }
        },
        select: {
          id: true,
          walletAddress: true,
          username: true,
          displayName: true,
          avatarUrl: true
        }
      });
      
      res.json({ users });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // Get all rooms
  async getRooms(req, res) {
    try {
      const rooms = await chatService.getAllRooms();
      res.json({ rooms });
    } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  }

  // Create a new room (DISABLED - only admins can create rooms)
  async createRoom(req, res) {
    res.status(403).json({ error: 'Room creation is disabled. Only administrators can create rooms.' });
  }

  // Get messages for a specific room or conversation
  async getRoomMessages(req, res) {
    try {
      const { id } = req.params;
      const currentUser = await ChatController.getUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Special handling for l4-community room - now allow messages
      if (id === 'l4-community') {
        // Ensure the L4 Community room exists
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
        
        const { before, limit = 20 } = req.query;
        const takeLimit = Math.min(parseInt(limit), 50);
        
        const whereClause = { roomId: 'l4-community' };
        if (before) {
          whereClause.createdAt = { lt: new Date(before) };
        }

        const messages = await prisma.message.findMany({
          where: whereClause,
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
            },
            reads: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: takeLimit
        });

        return res.json({ 
          messages: messages.reverse().map(msg => ({
            id: msg.id,
            content: msg.content,
            sender: {
              username: msg.sender.username,
              displayName: msg.sender.displayName,
              walletAddress: msg.sender.walletAddress,
              avatar: msg.sender.avatarUrl || (msg.sender.avatarBlob ? `data:image/jpeg;base64,${msg.sender.avatarBlob.toString('base64')}` : null),
              isVerified: !!msg.sender.walletAddress
            },
            timestamp: msg.createdAt.toISOString(),
            reactions: [],
            reads: (msg.reads || []).map(read => ({
              userId: read.userId,
              username: read.user.username || read.user.displayName || 'Anonymous',
              readAt: read.readAt.toISOString()
            }))
          })),
          hasMore: messages.length === takeLimit
        });
      }

      // Check if it's a DM conversation (dm- prefix)
      if (id.startsWith('dm-')) {
        const recipientId = id.substring(3);
        
        // Find or create conversation between current user and recipient
        let conversation = await prisma.conversation.findFirst({
          where: {
            type: 'dm',
            participants: {
              every: {
                userId: { in: [currentUser.id, recipientId] }
              }
            }
          },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              include: {
                sender: {
                  select: { username: true, displayName: true, avatarUrl: true, walletAddress: true }
                },
                reads: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        displayName: true
                      }
                    }
                  }
                }
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
                  { userId: currentUser.id },
                  { userId: recipientId }
                ]
              }
            },
            include: {
              messages: {
                orderBy: { createdAt: 'asc' },
                include: {
                  sender: {
                    select: { username: true, displayName: true, avatarUrl: true, walletAddress: true }
                  }
                }
              }
            }
          });
        }

        const messages = conversation.messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: {
            username: msg.sender.username || msg.sender.displayName,
            walletAddress: msg.sender.walletAddress,
            avatar: msg.sender.avatarUrl,
            isVerified: !!msg.sender.walletAddress
          },
          timestamp: msg.createdAt.toISOString(),
          reactions: [],
          reads: msg.reads || []
        }));

        return res.json({ messages });
      }
      
      // Handle regular room messages
      const messages = await chatService.getRoomMessages(id);
      res.json({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  // Send a message to a room or conversation
  async sendMessage(req, res) {
    try {
      const user = await ChatController.getUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      
      const { id: roomId } = req.params;
      const { content } = req.body || {};
      
      // Special handling for l4-community room - now allow messages
      if (roomId === 'l4-community') {
        const message = await chatService.sendMessage(roomId, content, user.id);
        return res.json({ message });
      }
      
      // Handle direct message conversations (dm- prefixed)
      if (roomId.startsWith('dm-')) {
        const recipientId = roomId.substring(3);
        
        // Find or create conversation between current user and recipient
        let conversation = await prisma.conversation.findFirst({
          where: {
            type: 'dm',
            participants: {
              every: {
                userId: { in: [user.id, recipientId] }
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
                  { userId: user.id },
                  { userId: recipientId }
                ]
              }
            }
          });
        }

        // Create message in conversation
        const message = await prisma.message.create({
          data: {
            content,
            senderId: user.id,
            conversationId: conversation.id
          },
          include: {
            sender: {
              select: { username: true, displayName: true, avatarUrl: true, walletAddress: true }
            }
          }
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() }
        });

        return res.status(201).json({ 
          message: {
            id: message.id,
            content: message.content,
            sender: {
              username: message.sender.username || message.sender.displayName,
              walletAddress: message.sender.walletAddress,
              avatar: message.sender.avatarUrl,
              isVerified: !!message.sender.walletAddress
            },
            timestamp: message.createdAt.toISOString(),
            reactions: []
          }
        });
      }
      
      // Handle regular room messages
      const message = await chatService.sendMessage(roomId, content, user.id);
      res.status(201).json({ message });
    } catch (error) {
      console.error('Error sending message:', error);
      if (error.message.includes('required') || error.message.includes('too long') || error.message.includes('Room not found')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to send message' });
      }
    }
  }

  // Upload an image
  async uploadImage(req, res) {
    try {
      const user = await ChatController.getUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }
      
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ url: imageUrl });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }

  // Add or remove reaction to a message
  async addReaction(req, res) {
    try {
      const user = await ChatController.getUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      
      const { id: messageId } = req.params;
      const { emoji } = req.body || {};
      
      const result = await chatService.toggleMessageReaction(messageId, user.id, emoji);
      res.status(200).json(result);
    } catch (error) {
      console.error('Reaction error:', error);
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to process reaction' });
      }
    }
  }

  // Utility method to get user from request
  // Follow a user
  async followUser(req, res) {
    try {
      const currentUser = await ChatController.getUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { userId } = req.params;
      
      // Check if user exists
      const userToFollow = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!userToFollow) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (userId === currentUser.id) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
      }

      // Create follow relationship
      const follow = await prisma.follow.create({
        data: {
          followerId: currentUser.id,
          followingId: userId
        }
      });

      res.json({ success: true, follow });
    } catch (error) {
      if (error.code === 'P2002') {
        res.status(400).json({ error: 'Already following this user' });
      } else {
        console.error('Error following user:', error);
        res.status(500).json({ error: 'Failed to follow user' });
      }
    }
  }

  // Unfollow a user
  async unfollowUser(req, res) {
    try {
      const currentUser = await ChatController.getUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { userId } = req.params;

      // Delete follow relationship
      await prisma.follow.deleteMany({
        where: {
          followerId: currentUser.id,
          followingId: userId
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error unfollowing user:', error);
      res.status(500).json({ error: 'Failed to unfollow user' });
    }
  }

  // Search for users
  async searchUsers(req, res) {
    try {
      const currentUser = await ChatController.getUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { q } = req.query;
      if (!q || q.length < 2) {
        return res.json({ users: [] });
      }

      // Search users by username, displayName, or walletAddress
      const users = await prisma.user.findMany({
        where: {
          AND: [
            { NOT: { id: currentUser.id } }, // Exclude current user
            {
              OR: [
                { username: { contains: q, mode: 'insensitive' } },
                { displayName: { contains: q, mode: 'insensitive' } },
                { walletAddress: { contains: q, mode: 'insensitive' } }
              ]
            }
          ]
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          walletAddress: true,
          avatarUrl: true,
          bio: true
        },
        take: 20 // Limit results
      });

      // Check follow status for each user
      const usersWithFollowStatus = await Promise.all(
        users.map(async (user) => {
          const isFollowing = await prisma.follow.findFirst({
            where: {
              followerId: currentUser.id,
              followingId: user.id
            }
          });

          const isFollowedBy = await prisma.follow.findFirst({
            where: {
              followerId: user.id,
              followingId: currentUser.id
            }
          });

          return {
            ...user,
            isFollowing: !!isFollowing,
            isFollowedBy: !!isFollowedBy
          };
        })
      );

      res.json({ users: usersWithFollowStatus });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  }

  static async getUser(req) {
    const token = req.cookies?.l4_session;
    if (!token) return null;
    const session = await prisma.session.findUnique({ 
      where: { token }, 
      include: { user: true } 
    });
    if (!session || session.expiresAt < new Date()) return null;
    return session.user;
  }
}

module.exports = new ChatController();