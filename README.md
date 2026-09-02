# BuildProof

SaaS for construction-site transparency: a client-facing dashboard showing
per-stage progress, photos, tasks and issues for each project.

## Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **React Router v7**
- **Supabase** (`@supabase/supabase-js`) — Postgres, Auth, Storage
- **Vercel** for hosting — the app is a pure SPA with no separate backend process

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL and anon key
npm run dev
```

## Environment variables

| Variable                 | Description                          |
| ------------------------ | ----------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL                |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (publishable) key |

Both are read in [`src/lib/supabaseClient.ts`](src/lib/supabaseClient.ts). They are
public by design (RLS enforces access control), but real values are never committed.

## Project structure

```
src/
  components/   reusable UI components
  pages/        route-level screens
  lib/          supabaseClient + helpers
  hooks/        custom hooks (useAuth, useProject, ...)
  types/        TypeScript types mirroring the Supabase schema
  routes.tsx    route table
  App.tsx       router + providers
  main.tsx      entry point
```

## Routes

| Path                       | Screen           | Access          |
| -------------------------- | ---------------- | --------------- |
| `/login`                   | Login            | public          |
| `/dashboard`               | Project list     | authenticated   |
| `/project/:id`             | Project overview | authenticated   |
| `/project/:id/stages`      | Stages           | authenticated   |
| `/project/:id/photos`      | Photos           | authenticated   |
| `/project/:id/tasks`       | Tasks            | authenticated   |
| `/project/:id/issues`      | Issues           | authenticated   |
| `/project/:id/settings`    | Settings         | authenticated   |

## Database schema

See [`src/types/db.ts`](src/types/db.ts) for the typed mirror of the tables:
`companies`, `profiles`, `projects`, `project_access`, `stage_templates`,
`project_stages`, `stage_history`, `photos`, `tasks`, `issues`.
