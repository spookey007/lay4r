import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: NextRequest) {
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

    // Check if current user is admin
    if (session.user.role !== 0) {
      return NextResponse.json({ error: 'Only admins can promote users' }, { status: 403 });
    }

    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { walletAddress },
      data: { role: 0 }
    });

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Failed to promote user to admin' }, { status: 500 });
  }
}
