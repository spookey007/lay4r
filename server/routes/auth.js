const express = require('express');
const router = express.Router();
const bs58 = require('bs58');
const nacl = require('tweetnacl');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prisma } = require('../lib/prisma');

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

function verifySignature(message, signatureBase58, publicKeyBase58) {
  try {
    console.log('🔍 Verifying signature for message (raw):', JSON.stringify(message));
    const messageBytes = new TextEncoder().encode(message);
    const signature = bs58.default.decode(signatureBase58);
    const publicKey = bs58.default.decode(publicKeyBase58);

    console.log('📊 Decoded signature length:', signature.length); // Should be 64
    console.log('🔑 Decoded public key length:', publicKey.length); // Should be 32

    const result = nacl.sign.detached.verify(messageBytes, signature, publicKey);
    console.log('✅ Verification result:', result);

    return result;
  } catch (e) {
    console.error('Error during signature verification:', e);
    return false;
  }
}
function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

router.post('/nonce', async (req, res) => {
  const { walletAddress } = req.body || {};
  if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' });
  const nonce = randomHex(16);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.nonce.create({ data: { walletAddress, value: nonce, expiresAt } });
  res.json({ nonce, expiresAt });
});

router.post('/login', async (req, res) => {
  const { walletAddress, signature, nonce } = req.body || {};

  if (!walletAddress || !signature || !nonce) {
    return res.status(400).json({ error: 'walletAddress, signature, nonce required' });
  }

  // Trim and validate nonce
  const cleanNonce = String(nonce).trim();
  if (cleanNonce.length !== 32) {
    console.warn('Invalid nonce length:', cleanNonce.length, 'value:', cleanNonce);
    return res.status(400).json({ error: 'Invalid nonce format' });
  }

  const nonceRow = await prisma.nonce.findFirst({ where: { walletAddress, value: cleanNonce } });
  if (!nonceRow || nonceRow.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired nonce' });
  }

  // ✅ CRITICAL: Must match client exactly
  const message = `Layer4 login\n${cleanNonce}`;

  // 🔍 DEBUG: Log with JSON.stringify to see actual \n
  console.log('🔍 Verifying message (raw):', JSON.stringify(message));
  console.log('🔑 Wallet:', walletAddress);
  console.log('📝 Signature:', signature);

  const ok = verifySignature(message, signature, walletAddress);
  if (!ok) {
    console.error('❌ Signature verification FAILED');
    return res.status(401).json({ error: 'Signature verification failed' });
  }

  await prisma.nonce.delete({ where: { id: nonceRow.id } });

  // Check if user exists and get their role
  let user = await prisma.user.findUnique({
    where: { walletAddress }
  }); 

  // If user doesn't exist, create them as a regular user (role 1)
  let isNewUser = false;
  if (!user) {
    // Generate a unique Reddit-style username and display name for new users
    const { generateUniqueUsername } = require('../lib/usernameGenerator');
    const { username, displayName } = await generateUniqueUsername();
    
    user = await prisma.user.create({
      data: { 
        walletAddress, 
        role: 1,
        username: username,        // e.g., "BrilliantExplorer5678"
        displayName: displayName  // e.g., "Brilliant Explorer"
      }
    });
    isNewUser = true;
    
    console.log(`🎉 New user created with username: ${username} and display name: ${displayName}`);
  }

  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({ data: { token, userId: user.id, expiresAt } });

  // Send welcome message for new users
  if (isNewUser) {
    try {
      const chatService = require('../services/chatService');
      // await chatService.sendWelcomeMessage(user.id);
      console.log('🎉 Welcome message sent for new user:', user.id);
    } catch (error) {
      console.error('❌ Failed to send welcome message:', error);
      // Don't fail the login if welcome message fails
    }
  }

  res.cookie('l4_session', token, {
    httpOnly: false, // Changed to false so WebSocket can access it
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });

  res.json({
    success: true,
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      role: user.role,
      isAdmin: user.role === 0,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarBlob: user.avatarBlob,
      bio: user.bio,
      email: user.email,
      emailVerified: user.emailVerifiedAt ? true : false
    },
  });
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.l4_session;
  if (token) await prisma.session.deleteMany({ where: { token } });
  res.cookie('l4_session', '', { httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: new Date(0) });
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  const token = req.cookies?.l4_session;
  if (!token) return res.json({ user: null });
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return res.json({ user: null });
  const { user } = session;

  // Convert avatar blob to data URL if it exists
  let avatarData = null;
  // if (user.avatarBlob) {
  //   // Convert buffer to proper base64 string
  //   const base64String = user.avatarBlob.toString('base64');
  //   avatarData = `data:image/jpeg;base64,${base64String}`;
  // }
  
  // Refresh the session cookie to ensure it's properly set
  res.cookie('l4_session', token, {
    httpOnly: false, // Changed to false so WebSocket can access it
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: session.expiresAt,
  });

  res.json({ 
    user: { 
      id: user.id, 
      walletAddress: user.walletAddress, 
      username: user.username, 
      role: user.role, 
      isAdmin: user.role === 0,
      displayName: user.displayName, 
      avatarUrl: user.avatarUrl,
      avatarBlob: user.avatarBlob,
      bio: user.bio,
      email: user.email,
      emailVerified: user.emailVerifiedAt ? true : false
    } 
  });
});

// Upload avatar image
router.post('/upload-avatar', avatarUpload.single('avatar'), async (req, res) => {
  try {
    const token = req.cookies?.l4_session;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file provided' });
    }

    // Read the file as a buffer (blob)
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../public/avatars', req.file.filename);
    const fileBuffer = fs.readFileSync(filePath);

    // Store the blob in the database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        avatarBlob: fileBuffer,
        // Keep avatarUrl as null since we're storing as blob
        avatarUrl: null
      }
    });

    // Remove the file from the filesystem since we're storing it in the database
    fs.unlinkSync(filePath);

    // Return a data URL for immediate use
    const base64String = fileBuffer;
    const dataUrl = `data:image/jpeg;base64,${base64String}`;
    res.json({ avatarBlob: dataUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Update user profile
router.put('/update', async (req, res) => {
  try {
    const token = req.cookies?.l4_session;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username, displayName, bio, email, avatarBlob, avatarUrl } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username: username || null,
        displayName: displayName || null,
        bio: bio || null,
        email: email || null,
        avatarBlob: avatarBlob || null,
        avatarUrl: avatarUrl || null,
      }
    });

    res.json({ 
      user: { 
        id: updatedUser.id, 
        walletAddress: updatedUser.walletAddress, 
        username: updatedUser.username, 
        role: updatedUser.role, 
        isAdmin: updatedUser.role === 0,
        displayName: updatedUser.displayName, 
        avatarUrl: updatedUser.avatarUrl,
        avatarBlob: updatedUser.avatarBlob,
        bio: updatedUser.bio,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerifiedAt ? true : false
      } 
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Request email verification
router.post('/email/request', async (req, res) => {
  try {
    const token = req.cookies?.l4_session;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in user record
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        email: email,
        emailOtp: otp,
        emailOtpExpiresAt: expiresAt
      }
    });

    // TODO: Send email with OTP (implement email service)
    console.log(`Email verification OTP for ${email}: ${otp}`);

    res.json({ message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('Email request error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Verify email with OTP
router.post('/email/verify', async (req, res) => {
  try {
    const token = req.cookies?.l4_session;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'OTP is required' });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || user.emailOtp !== otp || !user.emailOtpExpiresAt || user.emailOtpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        emailVerifiedAt: new Date(),
        emailOtp: null,
        emailOtpExpiresAt: null
      }
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verify error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Promote user to admin (only for existing admins)
router.post('/promote-admin', async (req, res) => {
  try {
    const token = req.cookies?.l4_session;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if current user is admin
    if (session.user.role !== 0) {
      return res.status(403).json({ error: 'Only admins can promote users' });
    }

    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' });

    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updatedUser = await prisma.user.update({
      where: { walletAddress },
      data: { role: 0 }
    });

    res.json({ 
      message: 'User promoted to admin successfully',
      user: {
        id: updatedUser.id,
        walletAddress: updatedUser.walletAddress,
        role: updatedUser.role,
        isAdmin: updatedUser.role === 0
      }
    });
  } catch (error) {
    console.error('Promote admin error:', error);
    res.status(500).json({ error: 'Failed to promote user to admin' });
  }
});

// Make sure to export the router
module.exports = router;


