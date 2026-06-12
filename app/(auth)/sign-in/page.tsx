import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/AuthForm";
import { getEnabledOAuthProviders } from "@/lib/auth/providers";

export const metadata: Metadata = {
  title: "Sign in · Cat Diary",
  description: "Open your field journal of every cat you've met.",
};

export default async function SignInPage() {
  const oauthProviders = getEnabledOAuthProviders();
  const t = await getTranslations("signIn");

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <Suspense>
        <AuthForm
          mode="sign-in"
          oauthProviders={oauthProviders}
          intro={
            <p className="text-sm leading-snug text-foreground/75">{t("welcome")}</p>
          }
        />
      </Suspense>
      <p className="text-sm text-muted">
        {t("newHere")}{" "}
        <Link href="/register" className="font-medium text-accent underline">
          {t("startDiary")}
        </Link>
      </p>
    </div>
  );
}
