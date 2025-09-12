import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// Deprecated: not used when using backend server
export const dynamic = "force-static";

function generateNonce(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  const { walletAddress } = await req.json();
  if (!walletAddress || typeof walletAddress !== "string") {
    return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
  }

  const value = generateNonce();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.nonce.create({
    data: { walletAddress, value, expiresAt },
  });

  return NextResponse.json({ nonce: value, expiresAt });
}


