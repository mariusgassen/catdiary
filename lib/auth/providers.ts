export type OAuthProviderId = "google" | "apple" | "facebook";

const OAUTH_ENV_VARS: Record<OAuthProviderId, [string, string]> = {
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  apple: ["APPLE_ID", "APPLE_SECRET"],
  facebook: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
};

const OAUTH_LABELS: Record<OAuthProviderId, string> = {
  google: "Google",
  apple: "Apple",
  facebook: "Facebook",
};

export function isOAuthProviderEnabled(id: OAuthProviderId): boolean {
  const [idVar, secretVar] = OAUTH_ENV_VARS[id];
  return Boolean(process.env[idVar] && process.env[secretVar]);
}

export function getEnabledOAuthProviders(): { id: OAuthProviderId; label: string }[] {
  return (Object.keys(OAUTH_ENV_VARS) as OAuthProviderId[])
    .filter(isOAuthProviderEnabled)
    .map((id) => ({ id, label: OAUTH_LABELS[id] }));
}
