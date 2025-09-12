import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("l4_session")?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 200 });
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const { user } = session;
  
  // Convert avatar blob to data URL if it exists
  let avatarData = null;
  if (user.avatarBlob) {
    // Convert buffer to proper base64 string
    const base64String = user.avatarBlob;
    avatarData = `data:image/jpeg;base64,${base64String}`;
  }
  
  return NextResponse.json({ 
    user: { 
      id: user.id, 
      walletAddress: user.walletAddress, 
      username: user.username, 
      role: user.role, 
      displayName: user.displayName, 
      avatarUrl: user.avatarUrl,
      avatarBlob: avatarData,
      bio: user.bio,
      email: user.email,
      emailVerified: !!user.emailVerifiedAt
    } 
  });
}