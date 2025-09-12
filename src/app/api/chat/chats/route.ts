import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";

export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie") || "";
  const res = await fetch(`${API_BASE}/chat/chats`, {
    method: "GET",
    headers: { cookie },
    // @ts-ignore
    credentials: "include"
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}


