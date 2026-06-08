import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { getEnabledOAuthProviders } from "@/lib/auth/providers";

export default function RegisterPage() {
  const oauthProviders = getEnabledOAuthProviders();

  return (
    <div className="flex flex-col items-center gap-4">
      <Suspense>
        <AuthForm mode="register" oauthProviders={oauthProviders} />
      </Suspense>
      <p className="text-sm text-black/60 dark:text-white/60">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
