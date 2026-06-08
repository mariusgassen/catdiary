# 🐱 Cat Diary

Collect cats you've met all around the world. Connect to other cat lovers.

Cat Diary is a social network built around a simple ritual: you meet a cat,
you snap a photo, you note where you found it and what it was like. Over time
you build a personal collection — a diary of every cat you've crossed paths
with — and you can follow other cat lovers to browse theirs too.

## Features

- **Snap & log**: upload a photo of a cat, pin its location on a map, and add
  notes (name, breed/color, vibe, whatever you like)
- **Personal collection**: every cat you log is saved to your profile as a
  growing diary
- **Public & private profiles**: share your collection with the world, or
  keep it just for yourself (and the people you allow)
- **Follow other cat lovers**: build a feed of cats spotted by people you follow
- **Map & feed views**: browse cat sightings geographically or chronologically
- **Open registration**: anyone can sign up with an email and password
- **Installable on your phone**: the web app works as a PWA today, with native
  mobile apps planned for later — both talk to the same JSON API

## Tech stack

- **[Next.js](https://nextjs.org/)** (App Router, TypeScript) — UI and API in one app
- **[PostgreSQL](https://www.postgresql.org/)** + **[Prisma](https://www.prisma.io/)** — database and ORM
- **[Auth.js](https://authjs.dev/)** — authentication (email/password, open registration)
- **[MinIO](https://min.io/)** — S3-compatible object storage for cat photos
- **[sharp](https://sharp.pixelplumbing.com/)** — image processing/thumbnails

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture, data model, and
development conventions.

## Quick start (local development)

Requirements: Docker and Docker Compose.

```bash
cp .env.example .env   # fill in secrets (DB password, auth secret, MinIO keys)
docker compose up
```

This starts three services:

- `web` — the Next.js app (http://localhost:3000)
- `db` — PostgreSQL
- `minio` — S3-compatible object storage for uploaded photos (console at http://localhost:9001)

On first run, apply the database schema:

```bash
docker compose exec web npx prisma migrate deploy
```

## Deploying with Coolify

Cat Diary ships as a `docker-compose.yml` with three services (`web`, `db`,
`minio`), which Coolify can deploy directly as a Docker Compose resource.

1. Point Coolify at this repository and select `docker-compose.yml`
2. Configure the required environment variables/secrets (see `.env.example`):
   database credentials, `AUTH_SECRET`, and MinIO access/secret keys
3. Make sure persistent volumes are configured for:
   - the Postgres data directory (so your database survives redeploys)
   - the MinIO data directory (so uploaded photos survive redeploys)
4. Deploy — Coolify will build and start all three services behind your domain

## Contributing

This is an early-stage project — see [`CLAUDE.md`](./CLAUDE.md) for the
intended architecture and conventions before diving in.
