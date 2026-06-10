import { NextResponse } from "next/server";
import { searchUsers } from "@/lib/users";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const users = await searchUsers(q);
  return NextResponse.json({ users });
}
