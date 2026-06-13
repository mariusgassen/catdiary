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
cat (paw stamp) · Alerts (notifications) · My diary. Theming is class-based via `next-themes`
(Light / Dark / System setting on your own profile, System by default). Full
capture flow (native camera API, gallery fallback, GPS + OpenStreetMap
Nominatim location, hashtag highlight overlay in caption) and a Discover page
with tag/breed/name filtering.

Keep this document in sync with reality as the app evolves.

## Roadmap

For the strategic feature brainstorm — the bigger bets (the `Cat` entity,
re-identification, photo calendar, welfare/lost-and-found, monetization, …) and
the deliberate **anti-features** that protect the field-journal identity — see
[`docs/feature-ideas.md`](docs/feature-ideas.md). The sections below track the
near-term, tactical roadmap and what's already shipped.

### Done
- Bottom tab nav with icons (Journal, Discover, Log a cat, Map, My diary)
- Field-journal entry cards: taped polaroid photo with name/breed caption,
  rubber-stamp date, notes with hashtags, place name, paw-print likes
- **Custom frames (journal artifacts)**: each entry picks a `CatEntry.frameStyle`
  enum — Polaroid (default), pressed-specimen card, library index card, postcard
  ("Greetings from {place}"), or ticket stub. The render layer is
  `components/EntryFrame.tsx` (shared by the feed/detail cards and the
  `FramePicker` preview); the frame is chosen in the capture flow and the edit
  screen, previewed on the user's own cover photo, and persisted in capture
  drafts. Purely presentational — it never gates documenting (always defaults to
  Polaroid)
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
- **In-app notifications**: `Notification` model (LIKE, COMMENT, REPLY, FOLLOW,
  MENTION types); created in `lib/notifications.ts` and wired into `lib/likes.ts`,
  `lib/comments.ts`, `lib/follows.ts`, and `lib/catEntries.ts`; polled every
  30 s in the nav with an unread badge; `/notifications` page marks all read on
  view; `GET/PATCH /api/notifications`, `GET /api/notifications?unread=1`
- **@username mentions**: search-as-you-type autocomplete in the caption
  textarea of the capture flow; typing `@` shows a user dropdown backed by
  `GET /api/users?q=`; selecting a suggestion inserts `@username ` and fires a
  MENTION notification when the entry or comment is saved
- **Web push notifications** (PWA): service worker handles `push` +
  `notificationclick` events; VAPID keys in env (`VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_CONTACT`); `POST/DELETE /api/push-subscriptions`
  to register/unregister devices; `lib/webpush.ts` sends to all registered
  devices for a user on each notification event; stale subscriptions (410/404)
  are auto-cleaned
- **Notification settings**: per-type in-app toggles (paws, notes/replies, new
  readers, mentions) stored as `User.notifyLikes/notifyComments/notifyFollows/
  notifyMentions`; per-device push toggle in Settings → Notifications via the
  Web Push Notifications Permission API; `PATCH /api/me` accepts all four prefs
- **Notification grouping / summary**: `groupNotifications` in
  `lib/notifications.ts` collapses likes/follows into "X and N others pawed your
  entry"; `NotificationsView` renders the grouped text and links
- **Invite links**: every user has a personal `/invite/[code]` link ("Invite
  friends" section in Settings — Web Share API with clipboard fallback,
  `POST /api/me/invite`, code generated on first share); the landing page is
  public (proxy lets it through) with OG tags, showing the inviter's name and
  entry count; registering through the link records `User.invitedById` and
  auto-follows the inviter — approved even for private diaries, since an
  invitation implies approval — so new users start with a non-empty feed
  (`lib/invites.ts`; credentials registration only, OAuth signups don't carry
  the code yet)
- Discover page: tag/name/breed filter, "often spotted" tag chips, URL-driven (`?q=`)
- Design system: sunny cream/ink palette, fountain-pen blue accent, dot-grid
  texture, readable Geist typography
- Theme setting: Light / Dark / System (default System) via next-themes, in Settings
- **Richer profile pages**: grid/list toggle, entry count, follower/following counts,
  clickable follower/following links
- **Pending-follow approval UI**: `FollowRequestRow` + `PendingOutgoingRow` on
  private profiles; data model `Follow.approved` gates visibility
- **Edit profile**: display name, bio, avatar upload (`POST/DELETE /api/avatar`),
  private toggle all in Settings
- **Mention autocomplete in comments**: `@`-triggered dropdown in comment textarea,
  backed by `GET /api/users?q=`, same as capture flow
- **Mark individual notifications as read**: `PATCH /api/notifications` with
  `ids[]`; `NotificationsView` marks single notifications on click
- **Map tab**: Leaflet + OpenStreetMap tiles, photo-thumbnail markers, interactive
  popups; `GET /api/cat-entries/map` → `lib/catEntries.listCatEntriesForMap`
- **Map pin on entry detail page**: `<EntryMap>` shown when coordinates are present
- **Draft recovery**: `localStorage` draft in capture flow (`catdiary_capture_draft`
  key); restores caption, cat name, and breed on mount
- **Infinite scroll**: Intersection Observer sentinel in `FeedInfiniteScroll`;
  loads next page via `GET /api/cat-entries?cursor=`
- **Account deletion**: `DELETE /api/me`; confirm dialog in Settings; signs out and
  redirects
- **Public profile URL**: `/@username` route resolves username → `/profile/{id}`
- **"On This Day"**: `listOnThisDayEntries` queries same month/day in prior years;
  `<OnThisDayStrip>` horizontal scroll above the feed
- **Directional page-fold transitions**: each navigation folds the new page
  into place like turning a leaf in the journal — forward navigations fold in
  hinged on the right edge, back navigations on the left so the motion reverses
  (a pronounced 40° `rotateY`, not a subtle slide). `components/PageTransition.tsx`
  decides direction from *how* you navigated: a `popstate` (the back/forward
  button or edge-swipe) is a history traversal whose direction is read from a
  per-entry index stamped into `history.state` (lower index = back, higher =
  forward); a tapped link/nav tab is a forward push. The wrapper is keyed on the
  pathname so a fresh element remounts and always plays the CSS `.page-fold-*`
  animation (in `globals.css`); the direction class is set in a callback ref,
  which runs in the commit phase before paint so there's no flash. Applied to the
  standard pages in `(main)/layout.tsx` (inside `PullToRefresh`, so only the page
  folds) and to the auth screens; skipped for the map (Leaflet sizing) and the
  full-screen capture/edit dialogs. Composited (transform + opacity) and collapses to a
  plain fade under `prefers-reduced-motion`
- **Haptic feedback**: `navigator.vibrate?.([10])` on like and follow actions
- **Nearby cats**: Haversine raw-SQL query in `listNearbyCatEntries`; "Cats near
  you" section in Discover requests geolocation and shows pins within 5 km
  (`GET /api/cat-entries/nearby?lat=&lng=&radius=`)

### Capture flow improvements
- **Photo editing** — crop, basic brightness/contrast before upload
- **Reorder photos** in the capture flow (order is currently capture/pick order)
- Gallery sheet polished for iOS (vs. browser file picker as fallback)

### PWA / mobile hardening
- Service worker caching strategy (currently handles push + notificationclick only)
- Offline-capable read view (cache feed in SW)
- Add-to-home-screen prompt

### API hardening
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
