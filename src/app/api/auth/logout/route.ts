import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";

export async function POST() {
  const res = await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" as any });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}


