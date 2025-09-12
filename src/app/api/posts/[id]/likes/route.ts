import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const res = await fetch(`${API_BASE}/posts/${params.id}/likes`, { method: "POST", credentials: "include" as any });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const res = await fetch(`${API_BASE}/posts/${params.id}/likes`, { method: "DELETE", credentials: "include" as any });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}


