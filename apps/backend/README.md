# Kanvas API

Fastify REST API for Kanvas, running on Bun with Drizzle over PostgreSQL and Zod
for request validation.

## Running it

From the repository root, `bun run dev` starts this alongside the web app. On its
own:

```sh
bun run dev     # watch mode on http://localhost:8000
bun run start   # no watcher
bun run build   # bundle to dist/
```

The database must be migrated first — see the [root readme](../../README.md#getting-started).

## Environment

Read from `apps/backend/.env`. Only `DATABASE_URL` is required in development.

| Variable        | Default                | Notes                                              |
| --------------- | ---------------------- | -------------------------------------------------- |
| `DATABASE_URL`  | —                      | Required                                           |
| `PORT`          | `8000`                 |                                                    |
| `NODE_ENV`      | `development`          | `development` \| `test` \| `production`            |
| `ORIGIN`        | —                      | Required in production; CORS allows any origin otherwise |
| `JWT_SECRET`    | a development constant | Must be set in production                          |
| `COOKIE_SECRET` | a development constant | Must be set in production                          |

`src/env.ts` validates these at boot and exits with a readable list if any are
missing or invalid.

## Layout

```
src/
  app.ts              plugin and route registration
  server.ts           listen, graceful shutdown
  env.ts              validated environment
  plugin/             db, authenticate, error handler
  utils/              response envelope, request helpers, fractional positions
  modules/<name>/
    <name>.route.ts       routes and their schemas
    <name>.controller.ts  parse, authorize, respond
    <name>.service.ts     shared queries and access rules
    <name>.types.ts       Zod schemas and inferred types
```

Every module follows that four-file split. Collection routes are mounted under
their parent (`/api/boards/:boardId/lists`) while item routes are flat
(`/api/lists/:id`), since an id is globally unique and the parent can be resolved
from the row.

## Responses

Success bodies share one envelope:

```json
{ "success": true, "status": 200, "data": {}, "message": "Success" }
```

Errors return `{ "success": false, "timestamp": "...", "message": "..." }` with the
status on the response. Unexpected failures collapse to a generic 500 rather than
leaking internals.

## Auth

Login issues a 15-minute JWT access token and a 7-day opaque refresh token, both as
httpOnly cookies; the access token is also returned in the body for clients that
prefer an `Authorization` header, which wins over the cookie when both are present.

Refresh tokens are stored hashed and rotated on use: the exchange revokes and
re-reads in one transaction, so a stolen token is usable at most once. A failed
refresh returns 401 and leaves the cookies in place.

Rate limits are 300 requests/minute globally and 10/minute on
`/register`, `/login` and `/refresh`.

## Permissions

| Action                                    | Who                                    |
| ----------------------------------------- | -------------------------------------- |
| Read an organization, its boards and cards | Admin and members                      |
| Add or remove members, rename, delete      | Organization admin                     |
| Leave an organization                      | Any member except the admin            |
| Create a board                             | Any member                             |
| Rename or delete a board                   | Board creator, or organization admin    |
| Create, edit, move, delete lists and cards | Any member of the board's organization |
| Delete a comment                           | Its author, or organization admin      |
| Delete an attachment                       | Its uploader, or organization admin    |
| Be assigned a card                         | Members of the card's organization only |

## Routes

All are prefixed `/api` and require authentication unless noted.

`/health` sits outside the prefix and is public. It round-trips the database and
answers 503 if that fails, so a process that is listening but cannot reach
Postgres can be taken out of rotation.

**Auth** — `/auth`

| Method | Path        | Notes                                       |
| ------ | ----------- | ------------------------------------------- |
| POST   | `/register` | Public; creates the account, does not log in |
| POST   | `/login`    | Public; sets both cookies                    |
| POST   | `/logout`   | Revokes this session's refresh token         |
| POST   | `/refresh`  | Authenticates on the refresh cookie alone    |

**Users** — `/users`

| Method | Path                 | Notes                            |
| ------ | -------------------- | -------------------------------- |
| GET    | `/me`                |                                  |
| PATCH  | `/me`                | Profile fields                   |
| PATCH  | `/me/password`       | Revokes every refresh token for the account |
| DELETE | `/me`                |                                  |
| GET    | `/me/organizations`  |                                  |
| GET    | `/search`            | Query string filter              |
| GET    | `/:id`               | Users who share an organization  |

**Organizations** — `/organizations`

| Method | Path                        |
| ------ | --------------------------- |
| POST   | `/`                         |
| GET    | `/`                         |
| GET    | `/:id`                      |
| PATCH  | `/:id`                      |
| DELETE | `/:id`                      |
| GET    | `/:id/members`              |
| POST   | `/:id/members`              |
| DELETE | `/:id/members/:userId`      |
| POST   | `/:id/leave`                |

**Boards, lists and cards**

| Method | Path                                   | Notes                             |
| ------ | -------------------------------------- | --------------------------------- |
| POST   | `/organizations/:organizationId/boards` |                                   |
| GET    | `/organizations/:organizationId/boards` |                                   |
| GET    | `/boards/:id`                          | Includes creator and lists        |
| PATCH  | `/boards/:id`                          |                                   |
| DELETE | `/boards/:id`                          |                                   |
| POST   | `/boards/:boardId/lists`               |                                   |
| GET    | `/boards/:boardId/lists`               |                                   |
| GET    | `/lists/:id`                           | Includes unarchived cards         |
| PATCH  | `/lists/:id`                           |                                   |
| PATCH  | `/lists/:id/move`                      | `{ previousId?, nextId? }`        |
| DELETE | `/lists/:id`                           |                                   |
| POST   | `/lists/:listId/cards`                 |                                   |
| GET    | `/lists/:listId/cards`                 | Filters: status, priority, assignee, archived |
| GET    | `/cards/:id`                           | Includes comments and attachments |
| PATCH  | `/cards/:id`                           | Only the keys sent are written    |
| PATCH  | `/cards/:id/move`                      | `{ listId?, previousId?, nextId? }` |
| DELETE | `/cards/:id`                           |                                   |

**Comments and attachments**

| Method | Path                        | Notes                                     |
| ------ | --------------------------- | ----------------------------------------- |
| POST   | `/cards/:cardId/comments`   |                                           |
| GET    | `/cards/:cardId/comments`   | Oldest first                              |
| DELETE | `/comments/:id`             | No edit route; comments have no `updated_at` |
| POST   | `/cards/:cardId/attachments`| Registers a URL; nothing here accepts uploads |
| GET    | `/cards/:cardId/attachments`|                                           |
| DELETE | `/attachments/:id`          | Removes the row, not the stored file      |

## Ordering

Lists and cards are ordered by a fractional `position` rather than a contiguous
index. A move sends the neighbours it was dropped between and the server takes
their midpoint, so reordering writes one row instead of renumbering siblings. When
the gap between two neighbours gets too small to split, `utils/position.ts`
rebalances that container and retries.
