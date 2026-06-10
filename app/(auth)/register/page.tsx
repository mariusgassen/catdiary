import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookLock, Camera, Users } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { getEnabledOAuthProviders } from "@/lib/auth/providers";

export const metadata: Metadata = {
  title: "Start your diary · Cat Diary",
  description:
    "Create a free Cat Diary account and keep a field journal of every cat you meet.",
};

const PERKS = [
  {
    icon: Camera,
    text: "Log every cat you meet — photos, notes, and the place you found them",
  },
  {
    icon: Users,
    text: "Follow other cat spotters and read their diaries in a daily feed",
  },
  {
    icon: BookLock,
    text: "Your diary, your rules — keep it public or make it private",
  },
];

export default function RegisterPage() {
  const oauthProviders = getEnabledOAuthProviders();

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <Suspense>
        <AuthForm
          mode="register"
          oauthProviders={oauthProviders}
          intro={
            <ul className="flex flex-col gap-2 text-sm leading-snug text-foreground/75">
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5">
                  <Icon size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          }
        />
      </Suspense>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-accent underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
