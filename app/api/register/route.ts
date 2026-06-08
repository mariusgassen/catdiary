import { NextResponse } from "next/server";
import { z } from "zod";
import { createUserWithPassword } from "@/lib/auth/credentials";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const user = await createUserWithPassword(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      return NextResponse.json({ error: "EMAIL_TAKEN" }, { status: 409 });
    }
    throw err;
  }
}
