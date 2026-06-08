---
name: catdiary-db-migration
description: Add or change a database model/field in Cat Diary using Prisma migrations. Use when the user wants to modify prisma/schema.prisma, create a migration, or update queries/types after a schema change.
---

# Cat Diary database migrations

Cat Diary uses Prisma against PostgreSQL. The schema lives at
`prisma/schema.prisma`; migration history is generated and tracked under
`prisma/migrations/`. Never hand-edit files in `prisma/migrations/` — always
go through the Prisma CLI so the migration history stays consistent with the
schema.

## Workflow for a schema change

1. **Edit `prisma/schema.prisma`** — add/modify the model or field. Keep the
   model lean (see `CLAUDE.md` "Data model sketch" for the current shape and
   conventions: `camelCase` fields, `cuid()` ids, explicit relations).

2. **Generate and apply the migration** (development):
   ```bash
   docker compose exec web npx prisma migrate dev --name <short_description>
   ```
   This creates a new folder under `prisma/migrations/`, applies it to the dev
   database, and regenerates the Prisma client.

3. **Update affected code**:
   - Server-side queries in `lib/` that touch the changed model
   - TypeScript types/interfaces that mirror the model shape
   - Any authorization checks that need to account for new fields (especially
     anything affecting visibility of `CatEntry` or `User` data — see the
     "Authorization checks belong server-side" convention in `CLAUDE.md`)

4. **Regenerate the client if needed** (usually automatic after `migrate dev`,
   but useful after pulling schema changes from elsewhere):
   ```bash
   docker compose exec web npx prisma generate
   ```

## Applying migrations in other environments

- **Production / Coolify deploy**: use `migrate deploy`, which only applies
  pending migrations and never prompts or generates new ones:
  ```bash
  npx prisma migrate deploy
  ```
- This should run as part of the deploy process (e.g. a release/start command
  in the `web` service) so production schema stays in lockstep with the code.

## Sanity checks before committing

- `git status` should show the new migration folder under `prisma/migrations/`
  alongside your `schema.prisma` change — commit them together
- Re-run the app locally and confirm the affected feature still works end to
  end (not just that the migration applied cleanly)
