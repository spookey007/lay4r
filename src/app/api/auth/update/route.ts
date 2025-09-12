import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("l4_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username, displayName, bio, avatarUrl, avatarBlob, email } = await req.json();

  // Validate username uniqueness if provided
  if (username) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }
  }

  // Validate email uniqueness and format if provided (non-empty)
  if (email !== undefined && email !== null && email !== "") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail && existingEmail.id !== session.user.id) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }
  }

  // Process avatar data
  let avatarData = {};
  if (avatarBlob !== undefined) {
    // Avatar was explicitly set to null (removal) or a new value
    if (avatarBlob === null) {
      // Remove avatar
      avatarData = { avatarBlob: null, avatarUrl: null };
    } else {
      // Convert base64 string to buffer
      const buffer = avatarBlob;
      avatarData = { avatarBlob: buffer, avatarUrl: null };
    }
  } else if (avatarUrl !== undefined) {
    // If avatarUrl is explicitly set to null or a URL, use that
    avatarData = { avatarUrl, avatarBlob: null };
  }

  // Prepare email update: only clear verification if the email actually changed
  let emailData: any = {};
  if (email !== undefined) {
    if (email === null || email === "") {
      emailData = { email: null, emailVerifiedAt: null, emailOtp: null, emailOtpExpiresAt: null };
    } else if (email !== session.user.email) {
      emailData = { email, emailVerifiedAt: null, emailOtp: null, emailOtpExpiresAt: null };
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(username !== undefined && { username }),
      ...(displayName !== undefined && { displayName }),
      ...(bio !== undefined && { bio }),
      ...emailData,
      ...avatarData,
    },
  });

  // Convert avatar blob to data URL for response
  let responseAvatarData = null;
  if (updatedUser.avatarBlob) {
    // Convert buffer to proper base64 string
    const base64String = updatedUser.avatarBlob;
    responseAvatarData = `data:image/jpeg;base64,${base64String}`;
  }

  return NextResponse.json({
    user: {
      id: updatedUser.id,
      walletAddress: updatedUser.walletAddress,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      bio: updatedUser.bio,
      email: updatedUser.email,
      emailVerified: !!updatedUser.emailVerifiedAt,
      avatarUrl: updatedUser.avatarUrl,
      avatarBlob: responseAvatarData,
      role: updatedUser.role,
    },
  });
}