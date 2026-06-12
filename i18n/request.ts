import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "./config";

export { LOCALES, DEFAULT_LOCALE, type Locale };

function detectLocale(cookieLocale: string | undefined, acceptLanguage: string | null): Locale {
  if (cookieLocale && LOCALES.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }
  if (acceptLanguage) {
    const langs = acceptLanguage
      .split(",")
      .map((l) => l.split(";")[0].trim().split("-")[0].toLowerCase());
    const match = langs.find((l) => LOCALES.includes(l as Locale));
    if (match) return match as Locale;
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const locale = detectLocale(
    cookieStore.get("NEXT_LOCALE")?.value,
    headerStore.get("accept-language"),
  );

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default as Record<string, unknown>,
  };
});
