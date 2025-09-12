import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

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

    const { otp } = await request.json();

    if (!otp) {
      return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || !user.emailOtp || !user.emailOtpExpiresAt) {
      return NextResponse.json({ error: 'No pending verification' }, { status: 400 });
    }

    if (user.emailOtp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    if (user.emailOtpExpiresAt < new Date()) {
      return NextResponse.json({ error: 'OTP expired' }, { status: 400 });
    }

    // Verify email
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailOtp: null,
        emailOtpExpiresAt: null
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Email verified successfully' 
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
  }
}
