# Chalkline

Coaching software that closes the loop. A trainer programs training for each
client; the client logs in, does the work, and marks it complete with results
and how hard it felt — and that completion lands back on the trainer's
dashboard the moment it happens. Modeled on the CoachRx workflow.

**The loop:** program → client completes → trainer sees "they finished."

## Features

- **Real accounts, two roles.** Trainers sign up and create client accounts;
  everyone gets their own view. Sessions are protected by middleware.
- **Program builder.** Build a session on a date with any number of exercises,
  each with sets / reps / load / tempo / rest and a coaching note.
- **Client logging.** Clients see what's assigned, log actual reps and load per
  exercise, rate the session (RPE 1–10), and leave a note for their coach.
- **Activity feed.** Every completion appears on the trainer's dashboard with
  the client's comment, RPE, and results, plus an unread badge.

## Tech

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Prisma 7](https://www.prisma.io) with the `better-sqlite3` driver adapter
- Email/password auth: `bcryptjs` hashing + a signed JWT session cookie (`jose`)

## Getting started

```bash
npm install
cp .env.example .env      # then set AUTH_SECRET (see below)
npx prisma migrate dev    # creates the SQLite database
npm run db:seed           # optional: demo trainer + clients + workouts
npm run dev
```

Open http://localhost:3000.

Generate a session secret for `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Demo accounts (after `npm run db:seed`)

| Role    | Email                | Password        |
| ------- | -------------------- | --------------- |
| Trainer | alex@chalkline.dev   | trainpass123    |
| Client  | maria@example.com    | clientpass123   |
| Client  | jordan@example.com   | clientpass123   |

## Project layout

- `prisma/schema.prisma` — data model (`User`, `Workout`, `Exercise`, `FeedItem`)
- `src/lib/` — `db` (Prisma client), `auth`/`session` (login + cookies), helpers
- `src/app/(auth)/` — login & register
- `src/app/(trainer)/` — dashboard, clients, program builder, session review
- `src/app/(client)/` — today, workout logging, history
- `src/components/` — UI kit and the prescription-card / builder / log-form pieces

## Going live later

Local dev uses SQLite. To deploy (e.g. Vercel):

1. Change the `datasource` provider in `prisma/schema.prisma` to `postgresql`
   and swap the adapter in `src/lib/db.ts` for a Postgres driver adapter.
2. Set `DATABASE_URL` (a hosted Postgres URL) and `AUTH_SECRET` as environment
   variables.
3. Run `prisma migrate deploy` against the new database.
