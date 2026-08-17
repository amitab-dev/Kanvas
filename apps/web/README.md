# Kanvas web

The Next.js 16 client for Kanvas: an App Router app that talks to the
[API](../backend/README.md) over HTTP and holds no server-side data of its own.

## Running it

From the repository root, `bun run dev` starts this alongside the API. On its own:

```sh
bun run dev     # http://localhost:3000
bun run build
bun run start
bun run lint
```

`.env` holds the one variable this app needs:

```sh
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

The API must be running and its database migrated, or every screen will show a
connection error. See the [root readme](../../README.md#getting-started).

## Stack

- Next.js 16 (App Router, Turbopack) and React 19
- Tailwind CSS v4 with shadcn components built on [Base UI](https://base-ui.com)
- react-hook-form with Zod resolvers
- axios for API calls, lucide-react for icons

> Next.js 16 renamed and changed enough that guessing at its API is a bad bet.
> The version's own docs ship in `node_modules/next/dist/docs`; `AGENTS.md`
> explains the convention.

## Routes

| Route                                                       | What it does                                                |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| `/`                                                         | Redirects to `/dashboard`                                    |
| `/auth/login`, `/auth/register`                             | Credentials; login honours a `next` query parameter          |
| `/dashboard`                                                | Organizations you own or belong to, and creating one         |
| `/dashboard/[organizationId]`                               | Boards, members and organization settings                    |
| `/dashboard/[organizationId]/boards/[boardId]`              | The kanban board: lists as columns, cards inside them        |
| `/dashboard/[organizationId]/boards/[boardId]/cards/[cardId]` | Card fields, comments, attachments, archive and delete      |

## Layout

```
src/
  proxy.ts                    server-side session gate (Next 16's middleware)
  app/                        routes; every page is a client component
  components/
    session-provider.tsx      resolves the signed-in user, guards the dashboard
    dashboard/                organization and board-list panels
    board/                    columns, card tiles, card detail sections
    ui/                       shadcn components, generated — avoid editing
  lib/
    api.ts                    axios instance, refresh interceptor, error helpers
    types.ts                  shapes the API returns
    schemas/                  Zod schemas mirroring the API's validation
    card-display.ts           badge styles and date helpers shared by the tiles and card page
```

## Sessions

Auth cookies are httpOnly, so the client can never read them; the API is the only
way to learn who you are.

`proxy.ts` runs before a route renders and redirects anyone without a session
cookie to `/auth/login?next=…`, so a signed-out visitor never loads the dashboard
shell. This is an optimistic check in the sense the Next docs mean — it tests that
a cookie exists, never that it is valid, and the API remains the authority. Two
details are load-bearing:

- It keys on the **refresh** cookie. The access token expires every 15 minutes, so
  keying on that would sign people out constantly.
- The client appends `?expired=1` when the API refuses to renew a session. A failed
  refresh leaves the dead cookie in the jar, and without that marker the proxy
  would read it as a session and bounce the user back into the dashboard, forever.
  On that marker the proxy clears both cookies instead.

If the API is on a different hostname the cookies are invisible to the proxy, so
it steps aside rather than locking out signed-in users, and `SessionProvider`
handles the guard alone.

`lib/api.ts` refreshes the access token on the first 401 and replays the request,
single-flighted so concurrent 401s trigger one refresh. A 401 that survives the
refresh sends the browser to login from wherever it happened.

## Conventions

- Pages own their data: each fetches in an effect, tracks its own loading and error
  state, and passes callbacks down. There is no data-fetching library.
- Mutations update local state directly from the response instead of refetching.
  Where a create or update route returns a bare row without its relations, the
  component fills them in from what it already knows.
- Controls the API would reject are hidden rather than disabled — board management,
  comment and attachment deletion all check the same rules the server enforces.
- Card drag and drop uses native HTML5 events, no dependency. A drop sends the
  neighbouring card ids to `PATCH /cards/:id/move`; a rejection rolls back and
  refetches the affected columns. Lists reorder with buttons so the operation stays
  keyboard-reachable.

## Known issues

`bun run build` currently fails on duplicate `@types/react` copies — see the
[root readme](../../README.md#known-issues). `next dev` is unaffected.
