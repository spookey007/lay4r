# Layer4 Chat System Architecture

This document describes the architecture of the Layer4 chat system, which follows a professional, layered approach with clear separation of concerns.

## Architecture Overview

The chat system is structured using a layered architecture with the following components:

1. **Routes** - Handle HTTP request routing
2. **Controllers** - Process requests and responses
3. **Services** - Contain business logic
4. **Data Access Layer** - Prisma ORM for database operations
5. **Socket Manager** - Handle real-time WebSocket communication

```
┌─────────────┐
│   Routes    │← HTTP Requests
└─────────────┘
       ↓
┌─────────────┐
│ Controllers │← Request Processing
└─────────────┘
       ↓
┌─────────────┐
│  Services   │← Business Logic
└─────────────┘
       ↓
┌─────────────┐
│     DAL     │← Database Operations
└─────────────┘

┌─────────────┐
│   Sockets   │← Real-time Communication
└─────────────┘
```

## Directory Structure

```
server/
├── controllers/
│   └── chatController.js      # Request/response handling
├── lib/
│   ├── prisma.js              # Database connection
│   └── socketManager.js       # WebSocket handling
├── routes/
│   └── chat.js                # HTTP route definitions
├── services/
│   └── chatService.js         # Business logic
└── index.js                   # Application entry point
```

## Component Details

### Routes (`server/routes/chat.js`)

- Defines HTTP endpoints for chat functionality
- Uses multer for file upload handling
- Delegates request processing to controllers
- No business logic, only routing

### Controllers (`server/controllers/chatController.js`)

- Handles HTTP request/response cycle
- Validates request parameters
- Calls appropriate service methods
- Formats responses and handles errors
- Does not contain business logic

### Services (`server/services/chatService.js`)

- Contains all business logic
- Interacts with the data access layer
- Performs data validation
- Handles complex operations
- Independent of HTTP layer

### Data Access Layer (`server/lib/prisma.js`)

- Manages database connection
- Provides Prisma client instance
- Handles connection pooling
- Abstracts database operations

### Socket Manager (`server/lib/socketManager.js`)

- Handles real-time WebSocket communication
- Manages room memberships
- Broadcasts events to connected clients
- Integrates with services for data operations

## API Endpoints

### Rooms

- `GET /api/chat/rooms` - Get all chat rooms
- `POST /api/chat/rooms` - Create a new chat room

### Messages

- `GET /api/chat/rooms/:id/messages` - Get messages for a room
- `POST /api/chat/rooms/:id/messages` - Send a message to a room

### Reactions

- `POST /api/chat/messages/:id/reactions` - Add/remove reaction to a message

### Media

- `POST /api/chat/upload-image` - Upload an image

## WebSocket Events

### Incoming Events

- `joinRoom` - Join a chat room
- `sendMessage` - Send a message
- `typing` - Typing indicator
- `addReaction` - Add/remove reaction to a message

### Outgoing Events

- `message` - New message received
- `typing` - User typing indicator
- `reactionUpdate` - Message reaction updated
- `error` - Error occurred

## Data Models

### Room

- id (string, primary key)
- name (string)
- createdAt (datetime)
- updatedAt (datetime)

### Message

- id (string, primary key)
- content (string)
- senderId (string, foreign key to User)
- roomId (string, foreign key to Room)
- createdAt (datetime)
- updatedAt (datetime)

### MessageReaction

- id (string, primary key)
- emoji (string)
- userId (string, foreign key to User)
- messageId (string, foreign key to Message)
- createdAt (datetime)

## Error Handling

All components follow consistent error handling patterns:
- Validation errors return 400 status codes
- Authentication errors return 401 status codes
- Authorization errors return 403 status codes
- Server errors return 500 status codes
- Errors are logged appropriately

## Security Considerations

- All endpoints validate user authentication
- File uploads are restricted to image files
- Content length is validated to prevent abuse
- Database queries use parameterized statements
- CORS is configured appropriately