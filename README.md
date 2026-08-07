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
- **Calendars for both roles.** The trainer's calendar merges programmed
  sessions with consults, check-ins and blocked-out time; the athlete gets a
  read-only one showing their own training and whatever their coach has booked
  with them. Either can push theirs to Google Calendar.

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

`AUTH_SECRET` signs session cookies **and** derives the key that encrypts stored
Google Calendar refresh tokens. Rotating it therefore signs everyone out *and*
makes existing calendar connections unreadable — those land in a "reconnect"
state rather than failing, but everyone who had connected one has to press the
button again.

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

### Owner admin area (optional)

Set `ADMIN_EMAILS` to your own address and `/admin` opens up: every account on
the app with the email and name it signed up under, how the account was created
(registered, added by a trainer, or Google), when it last signed in, and every
workout template, program, nutrition plan and assigned session it has built. A
second page logs every sign-in attempt, successful or not. From an account's
page you can rename it, change its email, move a client onto a different
trainer, switch it between trainer and client, reset its password, or delete it.

```
ADMIN_EMAILS="you@example.com,cofounder@example.com"
```

There are two tiers:

- **Owner** — named in `ADMIN_EMAILS`. Can do everything, including handing out
  the tier below. Nothing in the app can revoke an owner, because nothing in the
  app granted them: it's a config change and a redeploy.
- **Admin** — an owner presses **Make admin** on a trainer's account. They get
  the same pages and can manage ordinary accounts, but can't promote anyone else
  and can't reset, edit or delete another admin's account.

So a compromised admin account can't widen its own access, and leaving
`ADMIN_EMAILS` blank means there are no owners, nobody to promote anyone, and
`/admin` is a 404 for everyone. It's a 404 rather than a redirect for anyone
else who finds the URL.

Changing an account's role signs that account out — the session cookie carries
the role it was minted with, so it's retired rather than left to disagree with
the database.

### Rock climbing training

`/climbing` is open to trainers and clients alike: around sixty climbing-specific
movements — hangboard protocols, campus work, body tension, the antagonist work
that keeps elbows healthy, wall drills and endurance — each with the prescription
that actually makes it training rather than a name. Every one of them is also in
the exercise picker under **Rock Climbing**, so a coach can program them straight
into a session.

### Demo accounts (after `npm run db:seed`)

| Role    | Email                | Password        |
| ------- | -------------------- | --------------- |
| Trainer | alex@chalkline.dev   | trainpass123    |
| Client  | maria@example.com    | clientpass123   |
| Client  | jordan@example.com   | clientpass123   |

## Project layout

- `prisma/schema.prisma` — data model (`User`, `Workout`, `Exercise`, `FeedItem`,
  `LoginEvent`)
- `src/lib/` — `db` (Prisma client), `auth`/`session` (login + cookies),
  `reset-token`/`mail` (password resets and outbound email), `admin`
  (owner/admin gate), `login-log` (sign-in audit), `nav` (the tab bars),
  `calendar` (month maths and the merged item shape),
  `google`/`google-tokens`/`google-calendar`/`calendar-sync` (OAuth and the
  one-way push to Google), `exercise-presets`/`climbing-presets` (the shipped
  catalogs), helpers
- `src/app/(auth)/` — login, register, forgot & reset password
- `src/app/(trainer)/` — dashboard, clients, program builder, session review,
  calendar
- `src/app/(client)/` — today, workout logging, history, calendar
- `src/app/(shared)/` — pages both roles see (rock climbing training)
- `src/app/(admin)/` — owner-only account list, sign-in log, account management
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
     that touches a session fails. Rotating it signs everyone out and drops
     every Google Calendar connection.
   - `RESEND_API_KEY` / `MAIL_FROM` — optional; password resets and new-account
     emails. Without them `/forgot` points people at their trainer instead.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional; only if you want
     Google sign-in. Add the deployed origin's callback URL to the OAuth client,
     including preview domains if you sign in on those.
   - `ADMIN_EMAILS` — optional; your email, to unlock `/admin` (see above).
3. **Create the tables** against the production database:

   ```bash
   DATABASE_URL="<your production url>" npx prisma migrate deploy
   ```

4. Deploy. `npm run build` runs `prisma generate` via `postinstall`.

Seeding is optional in production and will create the demo accounts listed
above — skip it, or change those passwords, on anything public.
