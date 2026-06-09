export async function register() {
  // Only log in the Node.js server process, not in the Edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

  const log = (s = "") => console.log(s);

  log();
  log("  Cat Diary");
  log(`  ${base}`);
  log();
  log("  Pages ──────────────────────────────────────────");
  log("    /                        home / landing");
  log("    /sign-in                 sign in");
  log("    /register                create account");
  log("    /feed                    social feed (requires auth)");
  log("    /map                     map view (requires auth)");
  log("    /cat-entries/new         log a cat sighting");
  log("    /cat-entries/[id]        cat entry detail");
  log("    /cat-entries/[id]/edit   edit cat entry");
  log("    /profile/[userId]        user profile");
  log();
  log("  API endpoints ──────────────────────────────────");
  log("    GET  POST              /api/auth/[...nextauth]    Auth.js session");
  log("    POST                   /api/register              create account");
  log("    GET  POST              /api/cat-entries           list / create entries");
  log("    GET  PATCH  DELETE     /api/cat-entries/[id]      read / update / delete entry");
  log("    POST  DELETE           /api/follows               follow / unfollow");
  log("    GET  POST  DELETE      /api/follows/requests      list / approve / reject requests");
  log("    POST                   /api/upload-url            get presigned upload URL");
  log("    GET                    /api/health                health check");
  log();
  log("  Web resources ──────────────────────────────────");
  log("    /manifest.webmanifest  PWA manifest");
  log("    /favicon.ico           favicon");
  log();
}
