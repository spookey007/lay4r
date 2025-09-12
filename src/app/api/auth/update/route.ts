import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('l4_session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, displayName, bio, email } = await request.json();

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username: username || null,
        displayName: displayName || null,
        bio: bio || null,
        email: email || null
      }
    });

    return NextResponse.json({
      success: true,
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
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
