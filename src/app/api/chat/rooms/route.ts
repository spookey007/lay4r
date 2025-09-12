import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const cookie = req.headers.get("cookie") || "";

  if (type === 'users') {
    // Get users for direct messaging
    const res = await fetch(`${API_BASE}/chat/users`, { 
      method: "GET",
      headers: { cookie },
      // @ts-ignore
      credentials: "include" 
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } else {
    // Get rooms
    const res = await fetch(`${API_BASE}/chat/rooms`, { 
      method: "GET",
      headers: { cookie },
      // @ts-ignore
      credentials: "include"
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${API_BASE}/chat/rooms`, { method: "POST", headers: { "Content-Type": "application/json" }, body, credentials: "include" as any });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}