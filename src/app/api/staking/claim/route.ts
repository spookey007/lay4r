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

    // Get staking position
    const position = await prisma.stakingPosition.findFirst({
      where: { userId: session.user.id }
    });

    if (!position || position.pendingRewards.toNumber() <= 0) {
      return NextResponse.json({ error: 'No rewards to claim' }, { status: 400 });
    }

    // Create reward claim record
    const rewardAmount = position.pendingRewards.toNumber();
    const reward = await prisma.stakingReward.create({
      data: {
        userId: session.user.id,
        walletAddress: session.user.walletAddress,
        rewardAmount: rewardAmount,
        claimedAt: new Date(),
        claimTxHash: `claim_${Date.now()}`, // Mock transaction hash
        daysStaked: 180, // Default lock period
        apr: 0.365 // 36.5% APR
      }
    });

    // Reset pending rewards
    await prisma.stakingPosition.update({
      where: { id: position.id },
      data: {
        pendingRewards: 0
      }
    });

    return NextResponse.json({
      success: true,
      amount: rewardAmount,
      reward
    });
  } catch (error) {
    console.error('Error claiming rewards:', error);
    return NextResponse.json({ error: 'Failed to claim rewards' }, { status: 500 });
  }
}
