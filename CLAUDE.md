# CLAUDE.md

Guidance for Claude Code (and other contributors) working on Cat Diary.

## Status: greenfield blueprint

As of this writing, the repository contains no application code yet — only
this document, the README, and project skills. **This file describes the
intended architecture and conventions that the implementation should follow.**
As real code lands, keep this document in sync with reality: update sections
that turn out to be wrong, fill in details that emerge during development, and
remove the "blueprint" framing once the described structure actually exists.

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
| App framework | **Next.js (App Router, TypeScript)** | One deployable unit serving both UI and API routes — keeps docker-compose simple |
| Database | **PostgreSQL** | Reliable relational store; lat/lng as plain `Float` columns is enough for now (revisit PostGIS only if geo queries get complex) |
| ORM | **Prisma** | Type-safe schema/migrations, plays well with Next.js + TypeScript |
| Auth | **Auth.js (NextAuth)** | Email/password credentials provider for open registration; session via database adapter |
| Object storage | **MinIO** (S3-compatible) | Self-hosted, Coolify-friendly; photos accessed via presigned URLs so the app never proxies binary data |
| Image processing | **sharp** | Generate thumbnails on upload before storing to MinIO |
| Deployment | **docker-compose** (`web`, `db`, `minio`) | Deploys directly as a Coolify Docker Compose resource |

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
- **Server logic** (DB queries, auth checks, storage access) lives in `lib/`
  and is called from route handlers/server components — keep it out of
  client components
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
