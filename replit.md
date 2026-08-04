# YourWorld

A social/creator platform built with TanStack Start, React 19, TypeScript, Tailwind CSS, and Supabase. Features channels, moments, reels, orbits, chat, and notifications.

## How to run

```sh
bun run dev
```

The dev server starts on port 5000 (set via `DEV_PORT=5000` env var). The workflow "Start application" is configured to run this automatically.

## Stack

- **Framework**: TanStack Start (SSR) + React 19
- **Styling**: Tailwind CSS v4 + Radix UI components (shadcn/ui)
- **Auth & DB**: Supabase (`src/integrations/supabase/`)
- **Routing**: TanStack Router (file-based, `src/routes/`)
- **Package manager**: Bun

## Key directories

- `src/routes/` — file-based routes (channels, moments, reels, orbits, chat, etc.)
- `src/components/` — shared UI components
- `src/integrations/supabase/` — Supabase client, auth middleware, types
- `supabase/migrations/` — database migrations
- `public/` — static assets

## Environment

Supabase credentials are in `.env` (already configured). `DEV_PORT=5000` is set as a Replit env var so Vite binds to the correct port for the preview pane.

## User preferences
