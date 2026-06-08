---
name: catdiary-deploy
description: Prepare, verify, and update the Cat Diary Coolify/docker-compose deployment. Use when the user wants to change docker-compose.yml, add env vars or volumes, verify the compose stack builds, or get the deployment checklist before pushing to Coolify.
---

# Cat Diary deployment (Coolify / docker-compose)

Cat Diary deploys as a single `docker-compose.yml` with three services —
`web` (Next.js app), `db` (Postgres), `minio` (object storage) — which Coolify
runs directly as a Docker Compose resource.

## Verifying compose changes locally before pushing

Always validate before handing a compose change to Coolify:

```bash
docker compose config          # validates syntax & resolves env/interpolation
docker compose build           # builds the web image from its Dockerfile
docker compose up -d           # brings the full stack up locally
docker compose ps              # confirm all services report healthy/running
```

If you changed environment variables, also confirm `.env.example` documents
the new variable (name, purpose, example value/format) so deployments don't
silently miss it.

## Pre-deploy checklist

Before pushing a change that affects the deployment, confirm:

- [ ] **`docker compose config` and `docker compose build` succeed** locally
- [ ] **Persistent volumes are declared** for:
  - `db` — the Postgres data directory (otherwise the database resets on every redeploy)
  - `minio` — the object storage data directory (otherwise uploaded photos are lost)
- [ ] **All required env vars/secrets are documented** in `.env.example`:
  database connection string/credentials, `AUTH_SECRET`, MinIO
  root user/password (or access/secret keys), and the public base URL the app
  is served from
- [ ] **The `web` service applies pending migrations on startup**
  (e.g. `npx prisma migrate deploy` runs as part of the container's start
  command) so schema stays in sync with deployed code
- [ ] **Health checks** are defined where practical (especially for `db` and
  `minio`) so Coolify can tell when the stack is actually ready

## Configuring Coolify itself

1. Point the Coolify resource at this repo and select `docker-compose.yml`
2. Enter the environment variables/secrets from `.env.example` into Coolify's
   environment configuration for the resource (do **not** commit real secrets
   to the repo)
3. Map persistent storage for the `db` and `minio` volumes to Coolify-managed
   volumes so data survives redeploys
4. Trigger a deploy and watch the build/runtime logs for each service;
   confirm the app is reachable on the configured domain and that a fresh
   sign-up + cat-entry upload round-trips through Postgres and MinIO

## When something goes wrong post-deploy

- Check service logs in Coolify for `web`, `db`, and `minio` individually —
  most issues are either a missing/mistyped env var or a migration that didn't
  run
- If `web` can't reach `db`/`minio`, confirm the connection strings use the
  compose service names as hostnames (not `localhost`)
