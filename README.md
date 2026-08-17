# Kanvas

A Trello-style kanban tool: organizations own boards, boards hold lists, lists hold
cards, and cards carry comments and attachments.

The repository is a [Turborepo](https://turborepo.dev) monorepo run with
[Bun](https://bun.com).

## What's inside

| Path                         | Description                                                                |
| ---------------------------- | -------------------------------------------------------------------------- |
| `apps/backend`               | Fastify REST API, JWT auth over cookies ([readme](apps/backend/README.md))  |
| `apps/web`                   | Next.js 16 client ([readme](apps/web/README.md))                            |
| `packages/db`                | Drizzle schema, migrations and the Postgres client                          |
| `packages/eslint-config`     | Shared ESLint configs                                                       |
| `packages/typescript-config` | Shared `tsconfig.json` bases                                                |
| `packages/ui`                | Stub component library from `create-turbo`; the web app does not use it     |

## Requirements

- Bun 1.3.14 (the version pinned in `packageManager`)
- A PostgreSQL database

## Getting started

```sh
bun install
```

Create `apps/backend/.env`:

```sh
DATABASE_URL=postgresql://user:password@host:5432/kanvas
# Optional in development, required in production:
# PORT=8000
# NODE_ENV=development
# ORIGIN=https://your-web-origin
# JWT_SECRET=...
# COOKIE_SECRET=...
```

Apply the migrations before starting anything — against a database that is missing
them, every list and card route returns a 500:

```sh
cd packages/db && bun run db:migrate
```

`apps/web/.env` points the client at the API and already holds the local default:

```sh
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Then run everything:

```sh
bun run dev
```

- Web: http://localhost:3000
- API: http://localhost:8000 (health check at `/health`)

## Scripts

Run these from the repository root; each fans out through Turborepo.

| Script                | Description                            |
| --------------------- | -------------------------------------- |
| `bun run dev`         | Start every app in watch mode          |
| `bun run build`       | Build every app and package            |
| `bun run lint`        | Lint every workspace                   |
| `bun run check-types` | Typecheck every workspace              |
| `bun run format`      | Prettier over all `.ts`, `.tsx`, `.md` |

Target one workspace with a filter, for example `bunx turbo dev --filter=web`.

Database scripts live in `packages/db` and are run from there:

| Script                | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `bun run db:generate` | Generate a migration from changes to `src/schema.ts` |
| `bun run db:migrate`  | Apply pending migrations                             |
| `bun run db:push`     | Push the schema straight to the database             |
| `bun run db:studio`   | Open Drizzle Studio                                  |

All of them read `DATABASE_URL` from `apps/backend/.env` through
`packages/db/drizzle.config.ts`.

## How the pieces fit

The web app talks to the API over HTTP with credentials; there is no shared server
code between them. Login sets two httpOnly cookies, a 15-minute access token and a
7-day refresh token. The client refreshes the access token on its first 401 and
replays the request, so a session survives well past 15 minutes.

Authorization lives entirely in the API. The web app hides controls it knows will
be rejected, but never grants anything; the rules are listed under
[permissions](apps/backend/README.md#permissions).

## Known issues

- **`bun run build` fails in `web`.** `packages/ui` pins `@types/react` at
  `19.2.2` while `apps/web` resolves `^19` to a newer release, and the two copies
  produce incompatible `ref` types in `apps/web/src/components/ui/kbd.tsx` and
  `skeleton.tsx`. `next dev` is unaffected. Aligning the versions, or adding a root
  `overrides` entry for `@types/react`, clears it.
