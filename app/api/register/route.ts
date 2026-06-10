import { NextResponse } from "next/server";
import { z } from "zod";
import { createUserWithPassword, USERNAME_PATTERN } from "@/lib/auth/credentials";

const registerSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .transform((v) => v.trim().toLowerCase())
    .refine((v) => USERNAME_PATTERN.test(v), {
      message: "Use 3-30 lowercase letters, numbers, dots or underscores.",
    }),
  password: z.string().min(8),
  // Optional — the username is the display fallback when none is given.
  displayName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  // Optional invite-link code; stale/invalid codes are silently ignored.
  inviteCode: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => v || null),
});

const KNOWN_ERRORS = ["EMAIL_TAKEN", "USERNAME_TAKEN", "INVALID_USERNAME"] as const;

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
    if (err instanceof Error && (KNOWN_ERRORS as readonly string[]).includes(err.message)) {
      const status = err.message === "INVALID_USERNAME" ? 400 : 409;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}
