import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nacl from "tweetnacl";
import bs58 from 'bs58'
import crypto from "crypto";
import { PublicKey } from "@solana/web3.js";

function verifySignature(message: string, signatureBase58: string, publicKeyBase58: string): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signature = bs58.decode(signatureBase58);
    const publicKey = bs58.decode(publicKeyBase58);
    return nacl.sign.detached.verify(messageBytes, signature, publicKey);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

function generateToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, signature, nonce } = await req.json();

    // Validate required fields
    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json(
        { error: "walletAddress, signature, and nonce are required" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    try {
      new PublicKey(walletAddress);
    } catch {
      return NextResponse.json({ error: "Invalid Solana wallet address" }, { status: 400 });
    }

    // Find and validate nonce
    const nonceRow = await prisma.nonce.findFirst({
      where: { walletAddress, value: nonce },
    });

    if (!nonceRow || nonceRow.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 400 });
    }

    // ⚠️ CRITICAL: Message must exactly match what was signed on the client
    const message = `Layer4 login\n${nonce}`;

    // Optional: Log for debugging (remove in production)
    // console.log("🔍 Verifying signature for message:", message);

    const isValidSignature = verifySignature(message, signature, walletAddress);
    if (!isValidSignature) {
      console.warn("❌ Signature verification failed for wallet:", walletAddress);
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }

    // Clean up used nonce
    await prisma.nonce.delete({ where: { id: nonceRow.id } });

    // Check admin status
    const adminList = (process.env.ADMIN_WALLETS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const isAdmin = adminList.includes(walletAddress);

    // Upsert user
    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: isAdmin ? { role: "admin" } : {},
      create: {
        walletAddress,
        role: isAdmin ? "admin" : "user", // explicitly set default role
      },
    });

    // Generate session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: { token, userId: user.id, expiresAt },
    });

    // Return response with cookie
    const res = NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
      },
      token,
      expiresAt,
    });

    res.cookies.set("l4_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });

    return res;
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}