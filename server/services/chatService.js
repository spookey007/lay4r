const { prisma } = require('../lib/prisma');

class ChatService {
  // Get or create system user for automated messages
  async getOrCreateSystemUser() {
    try {
      let systemUser = await prisma.user.findFirst({
        where: {
          id: 'system'
        }
      });

      if (!systemUser) {
        systemUser = await prisma.user.create({
          data: {
            id: 'system',
            walletAddress: 'system',
            username: 'Layer4Bot',
            displayName: 'Layer4 Bot',
            bio: 'Automated system messages for Layer4 Community',
            role: 0 // Admin role
          }
        });
        console.log('✅ Created system user for automated messages');
      }

      return systemUser;
    } catch (error) {
      console.error('❌ Error getting/creating system user:', error);
      throw error;
    }
  }

  // Get or create the L4 Community Group channel
  async getOrCreateL4CommunityChannel() {
    try {
      // Try to find existing L4 Community Group
      let channel = await prisma.channel.findFirst({
        where: {
          name: 'L4 Community Group',
          type: 'text-group'
        }
      });

      if (!channel) {
        // Create the L4 Community Group channel
        channel = await prisma.channel.create({
          data: {
            name: 'L4 Community Group',
            type: 'text-group',
            topic: 'Welcome to the Layer4 Community! Share your thoughts, ask questions, and connect with other L4 holders.',
            createdBy: 'system',
            isPrivate: false
          }
        });
        console.log('✅ Created L4 Community Group channel:', channel.id);
      }

      return channel;
    } catch (error) {
      console.error('❌ Error getting/creating L4 Community Group:', error);
      throw error;
    }
  }

  // Send welcome message to a user
  async sendWelcomeMessage(userId) {
    try {
      // Ensure system user exists
      await this.getOrCreateSystemUser();

      // Check if user already received welcome message
      const existingWelcome = await prisma.message.findFirst({
        where: {
          authorId: 'system',
          content: {
            contains: 'Welcome to the Layer4 Community!'
          }
        },
        include: {
          reactions: {
            where: {
              userId: userId
            }
          }
        }
      });

      if (existingWelcome && existingWelcome.reactions.length > 0) {
        console.log('👋 User already received welcome message:', userId);
        return;
      }

      // Get or create L4 Community Group channel
      const channel = await this.getOrCreateL4CommunityChannel();

      // Add user to the channel if not already a member
      await prisma.channelMember.upsert({
        where: {
          channelId_userId: {
            channelId: channel.id,
            userId: userId
          }
        },
        create: {
          channelId: channel.id,
          userId: userId
        },
        update: {}
      });

      // Create welcome message
      const welcomeMessage = await prisma.message.create({
        data: {
          channelId: channel.id,
          authorId: 'system',
          content: `🎉 Welcome to the Layer4 Community! 

You've successfully joined the L4 Community Group. This is where L4 token holders come together to:
• Share market insights and analysis
• Discuss project updates and developments  
• Connect with fellow community members
• Ask questions and get support

We're excited to have you as part of the Layer4 ecosystem! 🚀

Feel free to introduce yourself and start engaging with the community.`,
          attachments: null,
          repliedToMessageId: null
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          }
        }
      });

      console.log('🎉 Welcome message sent to user:', userId, 'in channel:', channel.id);
      return welcomeMessage;

    } catch (error) {
      console.error('❌ Error sending welcome message:', error);
      throw error;
    }
  }

  // Create a reaction to mark that user received the welcome message
  async markWelcomeMessageReceived(userId, messageId) {
    try {
      await prisma.messageReaction.create({
        data: {
          messageId: messageId,
          userId: userId,
          emoji: '👋'
        }
      });
      console.log('✅ Marked welcome message as received for user:', userId);
    } catch (error) {
      console.error('❌ Error marking welcome message received:', error);
      throw error;
    }
  }
}

module.exports = new ChatService();
