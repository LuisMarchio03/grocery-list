# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Lista de Compras" — a minimal family shopping-list PWA. Next.js 14 (App Router) frontend + thin REST API routes backed by a Turso (libSQL/SQLite) database. UI text is Portuguese (pt-BR).

## Commands

```bash
npm run dev      # dev server at localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

There is **no test runner, linter, or formatter configured** — `next build` (which type-checks) is the only automated verification available.

## Environment & database setup

The app talks to a remote Turso database. Create `.env.local` with:

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

`schema.sql` is **not applied automatically** — run it against the Turso DB manually (e.g. `turso db shell <db> < schema.sql`) when provisioning a new database or changing the schema. There are no migrations; `schema.sql` is the single source of truth for table structure.

## Architecture

**Data model** (`schema.sql`): two tables. `lists` (id, name, created_at) and `items`, which reference a list via `list_id` with `ON DELETE CASCADE`. Each item carries `quantity`, boolean-as-integer flags `is_checked` / `is_promotion`, and `photo_base64`. IDs are `crypto.randomUUID()` generated in the route handlers, not the DB.

**DB access** (`src/lib/db.ts`): a single lazily-initialized libSQL client (`getDb()`). Import and call it inside each route handler — never instantiate clients elsewhere.

**API layer** (`src/app/api/**/route.ts`): thin CRUD route handlers, one file per resource. All use Next 14's synchronous `{ params }: { params: { id: string } }` signature (not the Promise form). The item `PUT` (`api/items/[id]/route.ts`) is a **partial-update**: it builds the `SET` clause dynamically from whichever of `name`/`quantity`/`is_checked`/`is_promotion`/`photo_base64` are present in the body, coercing booleans to 0/1. There is no request validation or auth.

**Client pages** are `'use client'` components that fetch from the API with `fetch()` and apply **optimistic updates** — mutating local `items`/`lists` state immediately, firing the request, then re-fetching to reconcile (and rolling back the optimistic state on failure, as in `addItem`). Two routes:
- `src/app/page.tsx` — list of lists (create/rename/delete).
- `src/app/lists/[id]/page.tsx` — items within a list. Items are split into active vs. a "Comprados" (purchased) section, sorted unchecked-first by the API query.

**Photos** are read client-side via `FileReader.readAsDataURL` and stored as full base64 data URLs directly in the `photo_base64` column — there is no file storage, compression, or size limit, so this can bloat rows and payloads.

**Font-size accessibility** (`src/lib/FontSizeContext.tsx` + `AccessibilityBar`): a context provider (mounted via `Providers` in `layout.tsx`) that scales the root `<html>` font-size and persists the choice to `localStorage`. The whole UI is sized in `rem`, so this rescales everything.

**PWA**: `public/manifest.json` + `public/sw.js` (a stale-while-revalidate cache for GET requests). The service worker is registered by an inline script in `layout.tsx`. Bump the `CACHE` constant in `sw.js` when changing cached assets.

## Conventions

- Path alias `@/*` → `./src/*`.
- TypeScript `strict` is **off** (`tsconfig.json`); don't rely on strict-null checks.
- Styling is Tailwind utility classes inline; custom keyframe animations live in both `tailwind.config.ts` and `globals.css` (e.g. `animate-check-bounce` is defined only in `globals.css`).
- Icons come from `lucide-react`.
