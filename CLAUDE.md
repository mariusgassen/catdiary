# CLAUDE.md

Guidance for Claude Code (and other contributors) working on Cat Diary.

## Status: mobile-first design in place

The initial scaffold has landed and the mobile-first redesign is live: a Next.js
(App Router) app with Auth.js (credentials + optional Google/Apple/Facebook
social login), Prisma/Postgres, MinIO-backed photo upload with sharp
thumbnailing, the core `CatEntry` create/list loop, Follow + a basic feed, and a
docker-compose stack (`web`/`db`/`minio`).

**Mobile design shipped:** bottom tab navigation (Feed · Search · Capture · Map
· Profile), Instagram-style feed cards with hashtag-aware captions, a full
capture flow (native camera API, gallery fallback, GPS + OpenStreetMap
Nominatim location, hashtag highlight overlay in caption), and a search page
with tag/breed/name filtering.

Keep this document in sync with reality as the app evolves.

## Roadmap

### Done
- Bottom tab nav with icons (Feed, Search, Capture, Map, Profile)
- Instagram-style feed cards: 4:5 photo, like/comment/share buttons, hashtag captions
- Capture flow: camera viewfinder (front/back), gallery picker, GPS auto-location,
  Nominatim place search, hashtag highlighting in caption textarea
- Search page: tag/name/breed filter, trending tag chips, URL-driven (`?q=`)
- Design system: warm cat-themed color tokens (accent orange), dark mode

### Core diary polish
- Edit/delete entries with confirmation
- Richer profile pages: grid/list toggle, entry count, follower/following counts
- Public/private visibility enforcement in all paths
- Pending-follow approval UI (data model exists, no UI yet)
- Edit profile: display name, bio, avatar upload, private toggle

### Social / engagement
- **Like API + optimistic UI** — button exists but calls no endpoint yet; needs
  `POST /api/cat-entries/[id]/like` toggle, viewer's own like state in the feed query
- **Comments UI** — data model exists; needs a detail page (`/cat-entries/[id]`)
  with comment thread, inline comment compose
- **In-app notifications** — new follower, like, comment; notification tab in nav
  (Bell icon placeholder); needs a `Notification` model and polling/push
- **Mentions** (`@username`) in captions — parser already handles `@`, needs
  search-as-you-type autocomplete in the capture form
- **Double-tap to like** — exists on the photo (onDoubleClick), but needs the
  Like API wired in

### Cat entry detail page
- `/cat-entries/[id]` — full-res photo, full caption, comments thread, map pin,
  like count; currently there is no detail page (cards do not link anywhere)
- Deep-link sharing: copy link, Open Graph meta for social previews

### Capture flow improvements
- **Photo editing** — crop, basic brightness/contrast before upload
- **Multiple photos** per entry (carousel), stored as an array of keys
- **Draft recovery** — `localStorage` draft so back-navigation doesn't lose form
- Gallery sheet polished for iOS (vs. browser file picker as fallback)

### Discovery
- **Map tab** — real map view with cat sighting pins using Leaflet + OpenStreetMap
  tiles (no API key needed); `/map` route is currently a stub
- **"On This Day"** resurfacing in the feed
- **Nearby cats** — distance-based filter using lat/lng; requires PostGIS or
  Haversine in a raw query
- Search: user search tab (currently only searches entries)

### Profile & settings
- Settings page (privacy toggle, sign out, account deletion)
- Public profile URL (`/@username` or `/profile/[id]`) with Open Graph tags
- Follow requests approval/rejection UI

### PWA / mobile hardening
- Service worker caching strategy (currently minimal `public/sw.js`)
- Web push notifications (VAPID keys, `PushSubscription` model)
- Haptic feedback on like/follow (`navigator.vibrate`)
- Offline-capable read view (cache feed in SW)
- Add-to-home-screen prompt
- Pull-to-refresh gesture

### API hardening
- Pagination: cursor already in `listCatEntriesForViewer`; feed needs infinite
  scroll (Intersection Observer client-side)
- Rate limiting on upload and entry creation
- API versioning strategy before native mobile client launches

### Native mobile app (future)
- All core features already go through `app/api/` — the web frontend is the
  first consumer; a React Native / Expo client is the intended second consumer
- Auth issues JWTs (cookie for web, bearer token for native)

## Project overview

Cat Diary is a social network for people who like to document cats they meet.
Core loop: a user uploads a photo of a cat, attaches a location and some notes,
and it's added to their personal collection ("diary"). Users can follow each
other, browse a feed/map of sightings, and choose whether their profile (and
their cats) is public or private.

Core entities:
- **User** — account, profile (display name, bio, avatar), `isPrivate` flag
- **CatEntry** — a single logged cat sighting: photo, location (lat/lng),
  optional name/breed/color, free-text notes, timestamp, owner (User)
- **Follow** — directed relationship between two users (follower → followee);
  for private profiles, follows may need to be approved
- **Like** / **Comment** — lightweight social interactions on a `CatEntry`

Keep the model lean. Don't add speculative entities (tags, badges,
notifications, etc.) until there's a concrete feature that needs them.

## Tech stack & rationale

| Concern | Choice | Why |
|---|---|---|
| App framework | **Next.js (App Router, TypeScript)** | One deployable unit serving both UI and a real JSON API — see "API design for multi-client support" below for why this scales fine |
| Database | **PostgreSQL** | Reliable relational store; lat/lng as plain `Float` columns is enough for now (revisit PostGIS only if geo queries get complex) |
| ORM | **Prisma** | Type-safe schema/migrations, plays well with Next.js + TypeScript |
| Auth | **Auth.js (NextAuth)**, JWT session strategy | Email/password credentials provider for open registration. JWT (not database) sessions mean the same login flow issues a token usable as a browser cookie *or* a bearer token for the future native mobile app — no divergent auth code paths later |
| Object storage | **MinIO** (S3-compatible) | Self-hosted, Coolify-friendly; photos accessed via presigned URLs so the app never proxies binary data |
| Image processing | **sharp** | Generate thumbnails on upload before storing to MinIO |
| Deployment | **docker-compose** (`web`, `db`, `minio`) | Deploys directly as a Coolify Docker Compose resource; `web` is a stateless Node container, so scale it horizontally with replicas behind Coolify's proxy if/when load requires it |

## API design for multi-client support

A native mobile app is planned for later (the initial launch is web + installable
PWA). To avoid a painful rewrite when that happens, **the route handlers under
`app/api/` are the single source of truth JSON API** — the web frontend is just
the first consumer of it, calling the same endpoints a future mobile client would.
Concretely:

- Don't build core features (creating a `CatEntry`, following, liking, feed
  pagination, etc.) as server-only data-fetching paths that only the web app can
  use (e.g. RSC-only data loading with no corresponding API route). If a mobile
  app would need it, it goes through `app/api/`.
- Auth issues JWTs (see Auth row above), so the same credentials endpoint serves
  browser sessions (httpOnly cookie) and future mobile/API clients (bearer token)
  without separate implementations.
- The web app should be configured as an installable **PWA** (web app manifest +
  service worker, e.g. via `next-pwa` or a hand-rolled manifest) from the start —
  it's the natural stepping stone to a native app and costs little to set up early.
- This is what makes "Next.js scales fine here" actually true in practice: the
  mobile app becomes just another consumer of the existing `lib/`-backed API
  rather than forcing a new backend to be built from scratch.

## Planned directory structure

```
app/                      # Next.js App Router routes (pages + API route handlers)
  (auth)/                 # sign-in / register routes
  (main)/                 # feed, profile, map, cat-entry pages
  api/                    # route handlers (or colocate with pages where sensible)
prisma/
  schema.prisma           # data model
  migrations/             # generated migration history
lib/                      # shared server logic: db client, auth config, storage (MinIO) helpers
components/               # shared React components
public/                   # static assets
docker/                   # Dockerfile(s), compose-related config
docker-compose.yml
.env.example
```

Adjust as the app takes shape — this is a starting layout, not a mandate.

## Data model sketch

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  displayName String
  bio         String?
  avatarKey   String?  // MinIO object key
  isPrivate   Boolean  @default(false)
  catEntries  CatEntry[]
  // ...Auth.js account/session relations
}

model CatEntry {
  id        String   @id @default(cuid())
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  photoKey  String   // MinIO object key
  name      String?
  breed     String?
  notes     String?
  latitude  Float
  longitude Float
  createdAt DateTime @default(now())
}

model Follow {
  followerId  String
  followeeId  String
  approved    Boolean @default(true) // false while pending, for private profiles
  // composite primary key (followerId, followeeId)
}
```

Treat this as a sketch to refine during implementation, not a final schema.

## Conventions

- **TypeScript strict mode** everywhere; no `any` without a comment explaining why
- **Hard rule — business logic lives in `lib/`, not in route handlers**: every
  `app/api/**/route.ts` handler does exactly three things — parse/validate the
  request, call into a `lib/` function, and serialize the response. DB queries,
  authorization checks, and storage access are implemented in `lib/` and are
  unit-testable independent of HTTP. This is the seam that lets the API be
  extracted into a standalone service later (e.g. for the mobile app, or for
  scaling) with minimal rewrite — treat any business logic that creeps into a
  route handler as a bug to fix, not a style nitpick
- **Migrations**: always generate them via `npx prisma migrate dev --name <description>`;
  never hand-edit files in `prisma/migrations/`
- **Authorization checks belong server-side**: every read/write of a
  `CatEntry` or profile must check the viewer's relationship to the owner
  (self, follower, or public) before returning data
- **Naming**: route folders and React components in `PascalCase`/`kebab-case`
  per Next.js conventions; database fields in `camelCase` (Prisma maps to
  `snake_case` columns if needed)
- **Commits**: short, imperative subject lines describing the *why* over the *what*

## Local development

```bash
cp .env.example .env
docker compose up              # starts web, db, minio
docker compose exec web npx prisma migrate dev   # apply/create migrations
docker compose exec web npx prisma db seed       # seed sample data (if/when a seed script exists)
```

See the `catdiary-dev` and `catdiary-db-migration` skills for detailed workflows.

## Gotchas

- **Always regenerate `package-lock.json` after changing version ranges in
  `package.json`**: `npm ci` (used in CI) hard-fails if the lock file is out of
  sync. After any version bump run `npm install --package-lock-only` and commit
  the updated lock file in the same PR. Learned from: bumping `@types/node ^20`
  → `^24` without updating the lock file caused CI to fail immediately.

- **Keep env var names consistent across docker-compose and application code**:
  the names on the left-hand side of `environment:` in docker-compose are what
  the app reads via `process.env`. Don't introduce aliases (e.g. a
  `MINIO_ACCESS_KEY` that shadows `MINIO_ROOT_USER`) — use the same name
  everywhere so there's only one variable to set per concern.

## Deployment notes (Coolify / docker-compose)

- The compose file defines three services: `web` (Next.js, built from a
  Dockerfile), `db` (postgres image), `minio` (minio image)
- **Persistent volumes are required** for `db` (Postgres data directory) and
  `minio` (object storage directory) — without them, data is lost on redeploy
- Required environment variables/secrets (document them in `.env.example` as
  they're introduced): database connection string, `AUTH_SECRET`,
  `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` (or access/secret keys), and the
  public base URL the app is served from
- See the `catdiary-deploy` skill for the pre-deploy checklist
