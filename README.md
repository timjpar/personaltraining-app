# Chalkline

Coaching software that closes the loop. A trainer programs training for each
client; the client logs in, does the work, and marks it complete with results
and how hard it felt — and that completion lands back on the trainer's
dashboard the moment it happens. Modeled on the CoachRx workflow.

**The loop:** program → client completes → trainer sees "they finished."

## Features

- **Real accounts, two roles.** Trainers sign up and create client accounts;
  everyone gets their own view. Sessions are protected by middleware. Sign in
  with an email and password, or with Google.
- **Program builder.** Build a session on a date with any number of exercises,
  each with sets / reps / load / tempo / rest and a coaching note.
- **Client logging.** Clients see what's assigned, log actual reps and load per
  exercise, rate the session (RPE 1–10), and leave a note for their coach.
- **Activity feed.** Every completion appears on the trainer's dashboard with
  the client's comment, RPE, and results, plus an unread badge.

## Tech

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Prisma 7](https://www.prisma.io) with the `pg` driver adapter → Postgres
- Auth: `bcryptjs` password hashing + a signed JWT session cookie (`jose`), and
  Google OAuth/OIDC spoken directly — no auth framework

## Getting started

You need a Postgres database — the same engine in development and production, so
what works locally is what deploys. A free hosted database (Neon, Supabase,
Vercel Postgres) is the quickest route; a local Postgres works just as well.

```bash
npm install
cp .env.example .env       # then fill in DATABASE_URL and AUTH_SECRET
npx prisma migrate deploy  # create the tables
npm run db:seed            # optional: demo trainer + clients + workouts
npm run dev
```

Open http://localhost:3000.

Generate a session secret for `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Use `npx prisma migrate dev` instead of `migrate deploy` when you're changing
`schema.prisma` and want a new migration generated.

### Google sign-in (optional)

The "Continue with Google" button is always on the sign-in page. Until
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set it says so when pressed,
and email and password keep working. To turn it on:

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth 2.0 Client ID** of type *Web application*.
2. Add an authorised redirect URI for every origin you serve from — the path is
   always `/api/auth/google/callback`:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://your-domain.com/api/auth/google/callback`
3. Put the client ID and secret in `.env`.

Signing in with a Google account whose (verified) email already exists takes
over that account rather than creating a second one, so a client whose trainer
made their account can use Google and stays a client. A brand-new email creates
a trainer workspace, exactly like `/register`.

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

## Deploying

The app needs a Node.js server and a Postgres database. Nothing is written to
disk, so it runs fine on serverless platforms.

1. **Create a Postgres database.** On Vercel: Storage → Create → Postgres (Neon).
   Any provider works.
2. **Set environment variables** on the host, for every environment that serves
   traffic (on Vercel: Production, Preview, and Development):
   - `DATABASE_URL` — the **pooled** connection string
   - `AUTH_SECRET` — a long random string (see above). Without it every request
     that touches a session fails.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional; only if you want
     Google sign-in. Add the deployed origin's callback URL to the OAuth client,
     including preview domains if you sign in on those.
3. **Create the tables** against the production database:

   ```bash
   DATABASE_URL="<your production url>" npx prisma migrate deploy
   ```

4. Deploy. `npm run build` runs `prisma generate` via `postinstall`.

Seeding is optional in production and will create the demo accounts listed
above — skip it, or change those passwords, on anything public.
