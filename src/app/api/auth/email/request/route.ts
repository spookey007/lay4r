import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/mailer";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("l4_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json();

  // Require user to have updated their email first via /api/auth/update
  if (!session.user.email) {
    return NextResponse.json({ error: "Please save your email first" }, { status: 400 });
  }

  if (email && email !== session.user.email) {
    return NextResponse.json({ error: "Email mismatch. Save changes first." }, { status: 400 });
  }

  // Unique check (defense in depth)
  const existingEmail = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (existingEmail && existingEmail.id !== session.user.id) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { emailOtp: otp, emailOtpExpiresAt: expiresAt, emailVerifiedAt: null },
  });

  try {
    await sendOtpEmail(updated.email as string, otp);
  } catch (e) {
    return NextResponse.json({ error: "Failed to send email. Check SMTP settings." }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "OTP sent to your email" });
}


