# Layer4 Codebase Index

## Project Overview
Layer4 (L4) is a satirical blockchain project implementing a "Layer 4 Tek" protocol designed for unbreakable financial stability. The platform enforces a "hold forever" mechanism where tokens can be acquired but never sold or transferred. This is a full-stack web application with real-time chat, staking, and social features.

## Tech Stack
- **Frontend:** Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Backend:** Node.js with Express.js, WebSocket for real-time communication
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Session-based with wallet address verification
- **Real-time:** WebSocket with msgpack-lite for efficient messaging
- **Styling:** Custom vintage "LisaStyle" font, modern-vintage theme
- **Deployment:** Vercel for frontend, separate server for backend

## Directory Structure

### Root Level
- `src/` - Frontend Next.js application
- `server/` - Backend Node.js server
- `prisma/` - Database schema and migrations
- `public/` - Static assets (images, videos, fonts)
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration
- `README.md` - Project documentation

### Frontend (src/)
- `app/` - Next.js app router pages and API routes
  - `api/` - API routes (auth, chat, staking, etc.)
  - `components/` - Reusable React components
  - `globals.css` - Global styles
  - `layout.tsx` - Root layout component
  - `page.tsx` - Home page
  - Various feature pages (chat, settings, dashboard, etc.)
- `hooks/` - Custom React hooks (useWebSocket, useTheme)
- `lib/` - Utility libraries (auth, api, prisma client, solana integration)
- `stores/` - Zustand state management stores
- `types/` - TypeScript type definitions
- `schemas/` - Validation schemas (Zod)

### Backend (server/)
- `index.js` - Main server entry point with Express and WebSocket setup
- `controllers/` - Route controllers
- `routes/` - Express route definitions
- `services/` - Business logic services
- `lib/` - Server utilities (prisma client, socket manager)
- `scripts/` - Utility scripts (set admin, seed data)

### Database (prisma/)
- `schema.prisma` - Database schema with all models
- `seed.js` - Database seeding script
- `migrations/` - Database migration files

## Key Files

### Frontend
- `src/app/layout.tsx` - Root layout with metadata and ClientLayout wrapper
- `src/app/ClientLayout.tsx` - Client-side layout with wallet provider and routing
- `src/app/page.tsx` - Landing page
- `src/app/chat/page.tsx` - Chat interface
- `src/app/settings/page.tsx` - User settings with avatar upload
- `src/app/dashboard/page.tsx` - Admin dashboard
- `src/app/api/auth/` - Authentication API routes (login, logout, me, update, etc.)
- `src/app/api/chat/` - Chat API routes (users, rooms, messages, media)
- `src/app/api/staking/` - Staking API routes (stake, claim, info, price)
- `src/components/chat/` - Chat components (sidebar, message list, input, etc.)
- `src/lib/auth.ts` - Authentication utilities
- `src/lib/api.ts` - API client functions
- `src/lib/solana.ts` - Solana blockchain integration
- `src/stores/chatStore.ts` - Chat state management

### Backend
- `server/index.js` - Main server with Express app, WebSocket server, and event handlers
- `server/routes/auth.js` - Authentication routes
- `server/routes/chat.js` - Chat routes
- `server/routes/staking.js` - Staking routes
- `server/services/chatService.js` - Chat business logic
- `server/controllers/chatController.js` - Chat controllers
- `server/lib/prisma.js` - Prisma client initialization

### Database
- `prisma/schema.prisma` - Complete database schema with all models

## API Endpoints

### Authentication
- `POST /api/auth/login` - Wallet login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update` - Update user profile
- `POST /api/auth/upload-avatar` - Upload avatar
- `POST /api/auth/promote-admin` - Promote user to admin
- `GET /api/auth/nonce` - Get login nonce
- `POST /api/auth/email/request` - Request email verification
- `POST /api/auth/email/verify` - Verify email

### Chat
- `GET /api/chat/users` - Search users
- `GET /api/chat/rooms` - Get user rooms
- `GET /api/chat/channels/[id]/messages` - Get channel messages
- `POST /api/chat/dm/create` - Create DM
- `POST /api/chat/media/upload` - Upload media
- `GET /api/chat/search-users` - Search users

### Staking
- `POST /api/staking/stake` - Stake SOL for L4 tokens
- `POST /api/staking/claim` - Claim staking rewards
- `GET /api/staking/info/[walletAddress]` - Get staking info
- `GET /api/staking/l4-price` - Get L4 token price

### WebSocket
- `/api/ws/chat` - WebSocket endpoint for real-time chat

## Database Schema

### Core Models
- **User** - User accounts with wallet addresses, profiles, status
- **Session** - User sessions for authentication
- **Nonce** - One-time nonces for wallet verification

### Social Features
- **Post** - User posts
- **Comment** - Comments on posts
- **Like** - Likes on posts
- **Follow** - User follow relationships

### Chat System
- **Channel** - Chat channels (DMs and groups)
- **ChannelMember** - Channel membership
- **Message** - Chat messages with attachments and replies
- **MessageReaction** - Message reactions
- **ReadReceipt** - Message read status

### Staking
- **StakingTransaction** - SOL staking transactions
- **StakingPosition** - User staking positions
- **StakingReward** - Staking rewards

## Development Scripts
- `npm run dev` - Start both frontend and backend in development
- `npm run frontend` - Start Next.js dev server
- `npm run websocket` - Start backend server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run seed` - Seed database
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client

## Deployment
- Frontend deployed to Vercel
- Backend deployed separately (likely to a VPS or cloud service)
- Database: PostgreSQL (managed or self-hosted)
- Environment variables required for database, wallet connections, etc.

## Key Features
- Wallet-based authentication (Phantom, Solana)
- Real-time chat with channels and DMs
- File/media uploads
- Staking system for SOL to L4 conversion
- User profiles with avatars
- Admin dashboard
- Email verification
- Social features (posts, comments, likes, follows)

This index provides a comprehensive overview of the Layer4 codebase structure and functionality.
