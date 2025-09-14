# Layer4 Chat System

A modern, real-time chat system built with Next.js 14, WebSocket, MessagePack, and PostgreSQL. Features Discord-like functionality with DMs, group chats, reactions, typing indicators, and more.

## Features

### Core Features
- ✅ **Real-time messaging** via WebSocket with MessagePack serialization
- ✅ **Direct Messages (DMs)** between users
- ✅ **Group Chats** with up to 10k members
- ✅ **Message reactions** with emoji picker
- ✅ **Media uploads** (images, videos, files)
- ✅ **Message editing & deletion** with audit trail
- ✅ **Read receipts** showing when messages were seen
- ✅ **Typing indicators** per channel
- ✅ **Message threading/replies**
- ✅ **User presence** (online/offline/away/idle)
- ✅ **Searchable message history**
- ✅ **User blocking & mute functionality**

### Technical Features
- 🚀 **High Performance**: MessagePack binary serialization (30-50% smaller than JSON)
- 🔄 **Real-time Sync**: WebSocket with Redis pub/sub for multi-instance scaling
- 💾 **Optimized Database**: PostgreSQL with Prisma ORM and proper indexing
- 🎨 **Modern UI**: Tailwind CSS with dark mode support
- 📱 **Responsive Design**: Works on desktop and mobile
- 🔒 **Secure**: JWT authentication and input validation

## Architecture

### Backend
- **Framework**: Next.js 14 App Router
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Raw WebSocket + MessagePack (not Socket.IO)
- **Cache**: Redis for presence, typing indicators, and pub/sub
- **File Storage**: Local file system (easily replaceable with S3/Cloudinary)

### Frontend
- **Framework**: Next.js 14 with React 19
- **State Management**: Zustand for chat state
- **Data Fetching**: TanStack Query (React Query)
- **UI**: Tailwind CSS with custom components
- **Real-time**: Custom WebSocket hook with MessagePack

## Database Schema

### Core Models
- **User**: User accounts with presence, blocking, and verification
- **Channel**: DMs and group channels with metadata
- **Message**: Messages with attachments, replies, and reactions
- **MessageReaction**: Emoji reactions on messages
- **ReadReceipt**: Track when users read messages
- **ChannelMember**: Channel membership and permissions

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 13+
- Redis 6+

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/layer4_chat"
JWT_SECRET="your-super-secret-jwt-key-here"
REDIS_URL="redis://localhost:6379"
WS_PORT=3001
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
```

3. **Set up the database**
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

4. **Start the development servers**
```bash
# Start both frontend and WebSocket server
npm run dev

# Or start them separately
npm run frontend    # Next.js on port 3000
npm run websocket   # WebSocket server on port 3001
```

5. **Access the chat system**
- Frontend: http://localhost:3000/chat
- WebSocket: ws://localhost:3001

## API Endpoints

### REST API
- `GET /api/chat/channels` - List user's channels
- `POST /api/chat/channels` - Create new channel
- `GET /api/chat/channels/[id]/messages` - Get channel messages
- `POST /api/chat/dm/create` - Create DM channel
- `GET /api/chat/users/search` - Search users
- `POST /api/chat/media/upload` - Upload media files

### WebSocket Events

#### Client to Server
- `SEND_MESSAGE` - Send a new message
- `EDIT_MESSAGE` - Edit existing message
- `DELETE_MESSAGE` - Delete message
- `ADD_REACTION` - Add emoji reaction
- `REMOVE_REACTION` - Remove emoji reaction
- `START_TYPING` - Start typing indicator
- `STOP_TYPING` - Stop typing indicator
- `FETCH_MESSAGES` - Load more messages
- `JOIN_CHANNEL` - Join a channel
- `LEAVE_CHANNEL` - Leave a channel
- `MARK_AS_READ` - Mark message as read
- `PING` - Keep connection alive

#### Server to Client
- `MESSAGE_RECEIVED` - New message received
- `MESSAGE_EDITED` - Message was edited
- `MESSAGE_DELETED` - Message was deleted
- `REACTION_ADDED` - Reaction was added
- `REACTION_REMOVED` - Reaction was removed
- `TYPING_STARTED` - User started typing
- `TYPING_STOPPED` - User stopped typing
- `USER_JOINED` - User joined channel
- `USER_LEFT` - User left channel
- `USER_STATUS_CHANGED` - User presence changed
- `READ_RECEIPT_UPDATED` - Read receipt updated
- `MESSAGES_LOADED` - Messages loaded
- `CHANNEL_CREATED` - New channel created
- `PONG` - Pong response

## Usage Examples

### Basic Chat Usage
```tsx
import { useChatEvents } from '@/hooks/useWebSocket';

function ChatComponent() {
  const { sendChatMessage, addReaction, startTyping } = useChatEvents();
  
  const handleSendMessage = () => {
    sendChatMessage('channel-id', 'Hello world!', []);
  };
  
  const handleAddReaction = () => {
    addReaction('message-id', '👍');
  };
  
  return (
    <div>
      <button onClick={handleSendMessage}>Send Message</button>
      <button onClick={handleAddReaction}>Add Reaction</button>
    </div>
  );
}
```

### State Management
```tsx
import { useChatStore } from '@/stores/chatStore';

function ChatSidebar() {
  const { channels, currentChannelId, setCurrentChannel } = useChatStore();
  
  return (
    <div>
      {channels.map(channel => (
        <button 
          key={channel.id}
          onClick={() => setCurrentChannel(channel.id)}
          className={currentChannelId === channel.id ? 'active' : ''}
        >
          {channel.name}
        </button>
      ))}
    </div>
  );
}
```

## Performance Optimizations

### MessagePack Benefits
- **30-50% smaller payloads** than JSON
- **Faster parsing** (~0.5ms vs ~2ms)
- **Binary-safe** for media metadata
- **No human-readable overhead**

### Database Optimizations
- **Proper indexing** on frequently queried fields
- **Pagination** for message loading
- **Soft deletes** for message history
- **Read receipts** to avoid N+1 queries

### Frontend Optimizations
- **Virtualized message list** (react-window ready)
- **Lazy loading** of media thumbnails
- **Debounced typing indicators** (300ms)
- **Optimistic UI updates** for immediate feedback
- **Connection pooling** and reconnection logic

## Scaling Considerations

### Horizontal Scaling
- **Redis Pub/Sub** for multi-instance message broadcasting
- **Load balancing** WebSocket connections
- **Database read replicas** for message queries
- **CDN** for media file delivery

### Vertical Scaling
- **Connection pooling** for database
- **Memory management** for WebSocket connections
- **Caching** recent messages in Redis
- **Rate limiting** per user/channel

## Security Features

- **JWT authentication** for WebSocket connections
- **Input validation** and sanitization
- **File type validation** for uploads
- **Rate limiting** on API endpoints
- **CSRF protection** on API routes
- **HTTPS/WSS** in production

## Development

### Code Structure
```
src/
├── app/
│   ├── api/chat/          # REST API endpoints
│   ├── components/chat/   # Chat UI components
│   └── chat/             # Chat page
├── hooks/
│   └── useWebSocket.ts   # WebSocket client hook
├── stores/
│   └── chatStore.ts      # Zustand state management
└── lib/
    ├── auth.ts           # NextAuth configuration
    └── upload.ts         # File upload utilities
```

### Adding New Features
1. **Database**: Add models to `prisma/schema.prisma`
2. **API**: Create endpoints in `src/app/api/chat/`
3. **WebSocket**: Add events to `server/index.js`
4. **Frontend**: Create components in `src/app/components/chat/`
5. **State**: Update stores in `src/stores/`

## Troubleshooting

### Common Issues

**WebSocket connection fails**
- Check JWT token is valid
- Verify WebSocket server is running on correct port
- Check firewall settings

**Messages not appearing**
- Verify user is member of channel
- Check database connection
- Look for WebSocket errors in console

**File uploads fail**
- Check file size limits (50MB max)
- Verify file type is allowed
- Check upload directory permissions

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=chat:*
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
