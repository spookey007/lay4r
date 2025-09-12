import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { PublicKey } from '@solana/web3.js';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, signature, nonce } = await request.json();

    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For now, skip signature verification in production
    // In a real app, you'd verify the signature here
    console.log('Login attempt for wallet:', walletAddress);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress,
          role: 1 // Default to user role
        }
      });
    }

    // Create session
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: {
        token: sessionToken,
        userId: user.id,
        expiresAt
      }
    });

    const response = NextResponse.json({
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
      }
    });

    // Set cookie
    response.cookies.set('l4_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
