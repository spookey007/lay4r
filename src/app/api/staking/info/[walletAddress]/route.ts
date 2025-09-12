import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walletAddress: string }> }
) {
  try {
    const { walletAddress } = await params;

    // Find user by wallet address
    const user = await prisma.user.findUnique({
      where: { walletAddress }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get staking position
    let position = await prisma.stakingPosition.findFirst({
      where: { userId: user.id }
    });

    if (!position) {
      // Create default staking position
      position = await prisma.stakingPosition.create({
        data: {
          userId: user.id,
          walletAddress: user.walletAddress,
          totalStaked: 0,
          pendingRewards: 0
        }
      });
    }

    return NextResponse.json({
      stakedAmount: position.totalStaked.toString(),
      pendingRewards: position.pendingRewards.toString(),
      dailyApr: (0.365 / 365).toFixed(6), // 36.5% APR / 365 days
      apr: "0.365", // 36.5% APR
      lockPeriodDays: 180
    });
  } catch (error) {
    console.error('Error fetching staking info:', error);
    return NextResponse.json({ error: 'Failed to fetch staking info' }, { status: 500 });
  }
}
