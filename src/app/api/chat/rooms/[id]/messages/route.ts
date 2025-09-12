import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${API_BASE}/chat/rooms/${id}/messages`, { credentials: "include" as any });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.text();
  const res = await fetch(`${API_BASE}/chat/rooms/${id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body, credentials: "include" as any });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}


