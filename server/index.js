// Load environment variables
require('dotenv').config({ path: '.env.local' });

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const dextoolsRoute = require('./routes/dextools');
const authRoute = require('./routes/auth');
const postsRoute = require('./routes/posts');
const chatRoute = require('./routes/chat');
const stakingRoute = require('./routes/staking');
const SocketManager = require('./lib/socketManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }
});

// Initialize socket manager
new SocketManager(io);

const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public'))); // Serve uploaded files

// API Routes
app.use('/api', dextoolsRoute);
app.use('/api/auth', authRoute);
app.use('/api/posts', postsRoute);
app.use('/api/chat', chatRoute);
app.use('/api/staking', stakingRoute);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Layer4 Chat Express backend running!');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log('Environment variables loaded:');
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');
  console.log('- CORS_ORIGIN:', process.env.CORS_ORIGIN || 'Default');
});

module.exports = app;