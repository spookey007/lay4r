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

    const { solAmount, l4Price, txHash } = await request.json();

    if (!solAmount || !l4Price || !txHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create staking transaction record
    const stakingTransaction = await prisma.stakingTransaction.create({
      data: {
        userId: session.user.id,
        walletAddress: session.user.walletAddress,
        solAmount: parseFloat(solAmount),
        l4Amount: parseFloat(solAmount) / parseFloat(l4Price),
        l4Price: parseFloat(l4Price),
        txHash,
        status: 'confirmed',
        confirmedAt: new Date(),
        lockPeriodDays: 180,
        apr: 0.365 // 36.5% APR
      }
    });

    // Update or create staking position
    const existingPosition = await prisma.stakingPosition.findFirst({
      where: { userId: session.user.id }
    });

    if (existingPosition) {
      await prisma.stakingPosition.update({
        where: { id: existingPosition.id },
        data: {
          totalStaked: existingPosition.totalStaked.toNumber() + parseFloat(solAmount)
        }
      });
    } else {
      await prisma.stakingPosition.create({
        data: {
          userId: session.user.id,
          walletAddress: session.user.walletAddress,
          totalStaked: parseFloat(solAmount),
          pendingRewards: 0
        }
      });
    }

    return NextResponse.json({
      success: true,
      transaction: stakingTransaction
    });
  } catch (error) {
    console.error('Error creating staking transaction:', error);
    return NextResponse.json({ error: 'Failed to create staking transaction' }, { status: 500 });
  }
}
