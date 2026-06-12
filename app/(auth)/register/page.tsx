import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookLock, Camera, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/AuthForm";
import { getEnabledOAuthProviders } from "@/lib/auth/providers";

export const metadata: Metadata = {
  title: "Start your diary · Cat Diary",
  description:
    "Create a free Cat Diary account and keep a field journal of every cat you meet.",
};

export default async function RegisterPage() {
  const oauthProviders = getEnabledOAuthProviders();
  const t = await getTranslations("register");

  const PERKS = [
    { icon: Camera, key: "log" as const },
    { icon: Users, key: "track" as const },
    { icon: BookLock, key: "privacy" as const },
  ];

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <Suspense>
        <AuthForm
          mode="register"
          oauthProviders={oauthProviders}
          intro={
            <ul className="flex flex-col gap-2 text-sm leading-snug text-foreground/75">
              {PERKS.map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-start gap-2.5">
                  <Icon size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                  {t(`perks.${key}`)}
                </li>
              ))}
            </ul>
          }
        />
      </Suspense>
      <p className="text-sm text-muted">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-accent underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
