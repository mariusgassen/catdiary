import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { getEnabledOAuthProviders } from "@/lib/auth/providers";

export default function SignInPage() {
  const oauthProviders = getEnabledOAuthProviders();

  return (
    <div className="flex flex-col items-center gap-4">
      <Suspense>
        <AuthForm mode="sign-in" oauthProviders={oauthProviders} />
      </Suspense>
      <p className="text-sm text-black/60 dark:text-white/60">
        New here?{" "}
        <Link href="/register" className="font-medium underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
