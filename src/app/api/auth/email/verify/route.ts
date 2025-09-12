import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("l4_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { otp } = await req.json();
  if (!otp) return NextResponse.json({ error: "OTP is required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.email || !user.emailOtp || !user.emailOtpExpiresAt) {
    return NextResponse.json({ error: "No OTP in progress" }, { status: 400 });
  }

  if (new Date() > user.emailOtpExpiresAt) {
    return NextResponse.json({ error: "OTP expired" }, { status: 400 });
  }

  if (otp !== user.emailOtp) {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), emailOtp: null, emailOtpExpiresAt: null },
  });

  return NextResponse.json({ success: true, emailVerified: true });
}


