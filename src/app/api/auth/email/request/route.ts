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

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with OTP
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        email,
        emailOtp: otp,
        emailOtpExpiresAt: otpExpiresAt
      }
    });

    // In a real app, you would send the OTP via email here
    console.log(`OTP for ${email}: ${otp}`);

    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent to email',
      // For development, include the OTP
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    console.error('Error requesting email verification:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
