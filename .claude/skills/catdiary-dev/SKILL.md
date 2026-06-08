---
name: catdiary-dev
description: Start, stop, and work with the Cat Diary local development stack (Next.js web app, Postgres, MinIO via docker compose). Use when the user wants to run the app locally, view logs, restart a service, reset the database, or troubleshoot the dev environment.
---

# Cat Diary local dev stack

Cat Diary runs locally as three docker-compose services: `web` (Next.js),
`db` (Postgres), and `minio` (S3-compatible object storage).

## First-time setup

```bash
cp .env.example .env     # fill in DB password, AUTH_SECRET, MinIO keys
docker compose up -d
docker compose exec web npx prisma migrate deploy
```

The app is then available at http://localhost:3000 and the MinIO console at
http://localhost:9001.

## Everyday commands

Start everything (foreground, with logs):
```bash
docker compose up
```

Start in the background:
```bash
docker compose up -d
```

Tail logs for one service:
```bash
docker compose logs -f web
```

Restart a single service after a config change:
```bash
docker compose restart web
```

Run a one-off command inside the app container (e.g. installing a package,
running a script):
```bash
docker compose exec web <command>
```

Stop everything:
```bash
docker compose down
```

## Resetting the database

To wipe and recreate the database from scratch (destroys local data):
```bash
docker compose down
docker volume rm catdiary_db_data   # match the actual volume name from `docker volume ls`
docker compose up -d db
docker compose exec web npx prisma migrate deploy
```

Confirm with the user before removing volumes if there's any chance the data
matters — this is destructive and not reversible.

## Troubleshooting

- **Port already in use** (3000, 5432, 9000/9001): another process is bound to
  that port. Stop it, or override the host port mapping in `docker-compose.yml`
  / an override file.
- **`web` can't reach `db` or `minio`**: confirm service names match the
  hostnames used in connection strings/env vars (compose gives each service a
  DNS name matching its key, e.g. `db`, `minio`) and that all three containers
  are `Up` (`docker compose ps`).
- **Schema out of sync / Prisma client errors**: run
  `docker compose exec web npx prisma generate` and re-apply migrations
  (`npx prisma migrate deploy` or `migrate dev` in development).
