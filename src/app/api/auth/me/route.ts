import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('l4_session')?.value;
    
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ user: null });
    }

    const { user } = session;
    console.log('User avatarBlob length:', user.avatarBlob ? user.avatarBlob.length : 'none');
    
    return NextResponse.json({
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
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
