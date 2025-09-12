const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const chatController = require('../controllers/chatController');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Validation middleware
const validateMessage = (req, res, next) => {
  const { content } = req.body || {};
  
  // Check if content exists
  if (!content) {
    return res.status(400).json({ error: 'Message content is required' });
  }
  
  // Check content length
  if (content.length > 1000) {
    return res.status(400).json({ error: 'Message content too long. Maximum 1000 characters allowed.' });
  }
  
  // If we have an image file, validate it
  if (req.file && !req.file.mimetype.startsWith('image/')) {
    return res.status(400).json({ error: 'Only image files are allowed' });
  }
  
  next();
};

// Validation middleware for rooms
const validateRoom = (req, res, next) => {
  const { name } = req.body || {};
  
  if (!name) {
    return res.status(400).json({ error: 'Room name is required' });
  }
  
  if (name.length > 50) {
    return res.status(400).json({ error: 'Room name too long. Maximum 50 characters allowed.' });
  }
  
  next();
};

router.get('/users', chatController.getUsers);
router.get('/rooms', chatController.getRooms);
router.get('/chats', chatController.getChats);
router.post('/rooms', validateRoom, chatController.createRoom);
router.get('/rooms/:id/messages', chatController.getRoomMessages);
router.post('/rooms/:id/messages', validateMessage, chatController.sendMessage);

// Image upload endpoint
router.post('/upload-image', upload.single('image'), validateMessage, chatController.uploadImage);

// Add reaction endpoint
router.post('/messages/:id/reactions', chatController.addReaction);

// Follow/Unfollow endpoints
router.post('/follow/:userId', chatController.followUser);
router.delete('/follow/:userId', chatController.unfollowUser);

// Search users endpoint
router.get('/search-users', chatController.searchUsers);

module.exports = router;