# CLAUDE.md

Guidance for Claude Code (and other contributors) working on Cat Diary.

## Status: mobile-first design in place

The initial scaffold has landed and the mobile-first redesign is live: a Next.js
(App Router) app with Auth.js (credentials + optional Google/Apple/Facebook
social login), Prisma/Postgres, MinIO-backed photo upload with sharp
thumbnailing, the core `CatEntry` create/list loop, Follow + a basic feed, and a
docker-compose stack (`web`/`db`/`minio`).

**Mobile design shipped — "field journal" design language:** the UI is styled
as a naturalist's notebook, not a photo-sharing feed clone. Sunny cream palette
with a fountain-pen blue accent, dot-grid page backgrounds (`.paper-grid`),
and Geist throughout for readability — the journal feel comes from layout, not
decorative fonts. Entries render as journal-page cards: a taped-in, slightly
tilted polaroid with a name/breed caption, a rubber-stamp date, diary notes,
coordinates in the footer, and paw-print reactions. The feed is a date-grouped
timeline ("Today", "Yesterday", …), profiles are diary covers ("X's Diary",
follow = "Read along"), and bottom tab navigation is Journal · Discover · Log a
cat (paw stamp) · Map · My diary. Theming is class-based via `next-themes`
(Light / Dark / System setting on your own profile, System by default). Full
capture flow (native camera API, gallery fallback, GPS + OpenStreetMap
Nominatim location, hashtag highlight overlay in caption) and a Discover page
with tag/breed/name filtering.

Keep this document in sync with reality as the app evolves.

## Roadmap

### Done
- Bottom tab nav with icons (Journal, Discover, Log a cat, Map, My diary)
- Field-journal entry cards: taped polaroid photo with name/breed caption,
  rubber-stamp date, notes with hashtags, place name, paw-print likes
- Date-grouped feed timeline with day dividers and masthead
- Capture flow: camera viewfinder (front/back), gallery picker, hashtag
  highlighting in caption textarea
- **Location as a place name — never raw lat/lng in the UI.** Defaults in
  priority order: photo EXIF GPS (`exifr`), device location, Nominatim place
  search; the user can also switch geo data off per entry. `latitude`/`longitude`
  are nullable and stay in the DB for the future map view; `locationName` is
  what gets displayed
- **Likes (paws)**: `POST /api/cat-entries/[id]/like` toggle with optimistic UI,
  viewer's own like state in feed/detail queries, double-tap on the photo
- **Comments as margin notes**: the detail page renders comments on a lined
  notebook page (`.ruled-page`: horizontal ruling + red margin rule, avatars in
  the gutter) with each note signed "— name · date"; delete by comment author
  or entry owner (`/api/cat-entries/[id]/comments`, `DELETE /api/comments/[id]`)
- **Threaded replies (tabulated margin notes)**: comments can be replied to;
  `Comment.parentId` always points at the thread root (replying to a reply
  joins the same thread), so display depth is capped at 2 and replies stay in
  posting order within a thread; replies render indented under their note and
  cascade-delete with the root
- **Similar cats** on the entry detail page: "Cats that look alike" strip of
  small prints under the comments, backed by pgvector CLIP embeddings
  (`GET /api/cat-entries/[id]/similar`, cosine distance + HNSW index,
  visibility-filtered)
- **Edit screen as a mobile dialog**: full-height sheet with top navigation —
  Cancel on the left, Save on the right, delete demoted to a destructive
  action at the bottom (still confirm()-guarded); bottom tab bar hidden while
  editing; the edit affordance on cards is a `SquarePen`
- **People in Discover**: search matches users by handle/display name next to
  entries, grouped by type ("People" rows linking to profiles, then "Cats"
  cards); `#tag` queries skip the people lookup (`GET /api/users?q=`,
  `searchUsers` in `lib/users.ts`)
- **Pull-to-refresh**: touch gesture on all main pages (capture/edit excluded)
  via `components/PullToRefresh.tsx` — axis-locked so photo swipes don't
  trigger it, calls `router.refresh()`; native browser pull-to-refresh is
  suppressed with `overscroll-behavior-y: contain`
- **Multiple photos per entry (up to 10)**: `CatEntryPhoto` model (ordered by
  `position`, photo 0 is the cover used for thumbnails/OG/embeddings); capture
  flow takes several shots or a multi-select from the gallery; cards show a
  swipeable polaroid stack with a counter and dots
- **Entry detail page** `/cat-entries/[id]` with comments and Open Graph meta;
  shareable while signed out (middleware lets these URLs through, the page
  404s anything the viewer isn't allowed to see)
- **Share links**: share button on cards (Web Share API, clipboard fallback)
- **Settings page** (`/settings`, cog on own profile): display name + bio edit,
  private-diary toggle, theme, sign out (`GET`/`PATCH /api/me`)
- **Username or email sign-in**: unique `username` column; registration requires
  one (both email and username unique), the sign-in form accepts either
- **Username change + display-name fallback**: the handle is editable in
  Settings (same rules/uniqueness as registration, `PATCH /api/me`);
  `displayName` is optional (nullable column, optional at registration and
  clearable in Settings) and every name render falls back to the username via
  `displayNameFor` in `lib/userDisplay.ts`
- Discover page: tag/name/breed filter, "often spotted" tag chips, URL-driven (`?q=`)
- Design system: sunny cream/ink palette, fountain-pen blue accent, dot-grid
  texture, readable Geist typography
- Theme setting: Light / Dark / System (default System) via next-themes, in Settings

### Core diary polish
- Richer profile pages: grid/list toggle, entry count, follower/following counts
- Public/private visibility enforcement in all paths
- Pending-follow approval UI (data model exists, no UI yet)
- Edit profile: display name, bio, avatar upload, private toggle

### Social / engagement
- **In-app notifications** — new follower, like, comment; notification tab in nav
  (Bell icon placeholder); needs a `Notification` model and polling/push
- **Mentions** (`@username`) in captions — parser already handles `@`, needs
  search-as-you-type autocomplete in the capture form

### Cat entry detail page
- Map pin on the detail page once the map view exists

### Capture flow improvements
- **Photo editing** — crop, basic brightness/contrast before upload
- **Reorder photos** in the capture flow (order is currently capture/pick order)
- **Draft recovery** — `localStorage` draft so back-navigation doesn't lose form
- Gallery sheet polished for iOS (vs. browser file picker as fallback)

### Discovery
- **Map tab** — real map view with cat sighting pins using Leaflet + OpenStreetMap
  tiles (no API key needed); `/map` route is currently a stub
- **"On This Day"** resurfacing in the feed
- **Nearby cats** — distance-based filter using lat/lng; requires PostGIS or
  Haversine in a raw query

### Profile & settings
- Account deletion, avatar upload in Settings
- Public profile URL (`/@username` or `/profile/[id]`) with Open Graph tags
- Follow requests approval/rejection UI

### PWA / mobile hardening
- Service worker caching strategy (currently minimal `public/sw.js`)
- Web push notifications (VAPID keys, `PushSubscription` model)
- Haptic feedback on like/follow (`navigator.vibrate`)
- Offline-capable read view (cache feed in SW)
- Add-to-home-screen prompt

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
  username    String?  @unique // required for credentials accounts, set at registration
  displayName String?  // optional — the UI falls back to username
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
  photos    CatEntryPhoto[] // 1..10 in display order; photo 0 is the cover
  name      String?
  breed     String?
  notes        String?
  locationName String? // human-readable place shown in the UI
  latitude     Float?  // null = geo data disabled for this entry
  longitude    Float?
  createdAt    DateTime @default(now())
}

model CatEntryPhoto {
  id         String  @id @default(cuid())
  catEntryId String
  photoKey   String  // MinIO object key (original)
  thumbKey   String? // MinIO object key (thumbnail)
  position   Int     @default(0)
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
