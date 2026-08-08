import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, isOwnerEmail, isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card, Badge, Avatar } from "@/components/ui";
import { formatStamp, formatDate } from "@/lib/format";
import {
  LOGIN_METHOD,
  LOGIN_OUTCOME,
  LOGIN_OUTCOME_LABELS,
  ROLES,
  SIGNUP_SOURCE_LABELS,
  toLoginOutcome,
  toSignupSource,
} from "@/lib/constants";
import { AccountControls } from "./AccountControls";
import { SignInMethods } from "./SignInMethods";
import { DangerZone } from "./DangerZone";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  // Everything this account owns, fetched here rather than linked to: the
  // trainer-facing pages for templates, programs and nutrition all scope by
  // `trainerId: <the signed-in trainer>`, so they'd 404 on someone else's work.
  //
  // Workouts are the exception, and only because they earned their own admin
  // route: reading what a coach actually programmed is the thing this page is
  // most often opened for, and a title with no way through to the session is a
  // dead end. See /admin/workouts/[id] — same render as the trainer's review
  // page, without the edit controls or the unread-clearing side effect.
  const [user, trainers] = await Promise.all([
    prisma.user.findUnique({
    where: { id },
    include: {
      trainer: { select: { id: true, name: true } },
      clients: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, lastLoginAt: true },
      },
      templates: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { exercises: true } } },
      },
      programs: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { slots: true } } },
      },
      nutritionTemplates: {
        orderBy: { updatedAt: "desc" },
        include: {
          client: { select: { name: true } },
          _count: { select: { meals: true } },
        },
      },
      workoutsAsTrainer: {
        orderBy: { scheduledDate: "desc" },
        take: 25,
        include: { client: { select: { id: true, name: true } } },
      },
      workoutsAsClient: {
        orderBy: { scheduledDate: "desc" },
        take: 25,
        select: {
          id: true,
          title: true,
          scheduledDate: true,
          status: true,
        },
      },
      logins: { orderBy: { createdAt: "desc" }, take: 50 },
      _count: {
        select: {
          workoutsAsTrainer: true,
          workoutsAsClient: true,
          templates: true,
          programs: true,
          nutritionTemplates: true,
        },
      },
    },
    }),
    // Candidates for the "coached by" picker. Every trainer, because moving a
    // client between workspaces is exactly the thing this page is for.
    prisma.user.findMany({
      where: { role: ROLES.TRAINER },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!user) notFound();

  const isTrainer = user.role === ROLES.TRAINER;

  // Phrased the way the cascade actually behaves, so the confirmation isn't
  // guessing. Clients are deliberately absent — they survive the delete.
  const removes = [
    [user._count.workoutsAsTrainer, "assigned workout"],
    [user._count.templates, "workout template"],
    [user._count.programs, "program"],
    [user._count.nutritionTemplates, "nutrition plan"],
    [isTrainer ? 0 : user._count.workoutsAsClient, "workout assigned to them"],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, noun]) => `${n} ${noun}${(n as number) === 1 ? "" : "s"}`);

  return (
    <Container>
      <Link href="/admin" className="text-sm text-ink-soft hover:text-ink">
        ‹ All accounts
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow={isTrainer ? "Trainer" : "Client"}
          title={user.name}
        >
          <span className="metric">{user.email}</span>
        </PageHeading>
      </div>

      <Card className="mt-6 grid gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
        <Detail label="Signed up">
          {SIGNUP_SOURCE_LABELS[toSignupSource(user.signupSource)]} ·{" "}
          {formatStamp(user.createdAt)}
        </Detail>
        <Detail label="Last signed in">
          {user.lastLoginAt ? formatStamp(user.lastLoginAt) : "Never"}
        </Detail>
        <Detail label="Sign-in methods">
          <SignInMethods
            userId={user.id}
            firstName={user.name.split(" ")[0] || user.name}
            hasPassword={Boolean(user.passwordHash)}
            hasGoogle={Boolean(user.googleId)}
            canSet={!isAdminUser(user) || isOwnerEmail(admin.email)}
          />
        </Detail>
        {user.trainer ? (
          <Detail label="Coached by">
            <Link
              href={`/admin/users/${user.trainer.id}`}
              className="hover:text-jade-strong"
            >
              {user.trainer.name}
            </Link>
          </Detail>
        ) : null}
        {isOwnerEmail(user.email) ? (
          <Detail label="Access">
            <Badge tone="amber">Owner (ADMIN_EMAILS)</Badge>
          </Detail>
        ) : user.isAdmin ? (
          <Detail label="Access">
            <Badge tone="jade">Admin</Badge>
          </Detail>
        ) : null}
      </Card>

      {isTrainer ? (
        <>
          <Section title="Clients" count={user.clients.length}>
            {user.clients.map((c) => (
              <Row
                key={c.id}
                href={`/admin/users/${c.id}`}
                title={c.name}
                sub={c.email}
                meta={c.lastLoginAt ? formatStamp(c.lastLoginAt) : "Never signed in"}
              >
                <Avatar name={c.name} />
              </Row>
            ))}
          </Section>

          <Section title="Workout templates" count={user.templates.length}>
            {user.templates.map((t) => (
              <Row
                key={t.id}
                title={t.title}
                sub={t.notes ?? undefined}
                meta={`${t._count.exercises} exercise${t._count.exercises === 1 ? "" : "s"}`}
              />
            ))}
          </Section>

          <Section title="Programs" count={user.programs.length}>
            {user.programs.map((p) => (
              <Row
                key={p.id}
                title={p.title}
                sub={p.notes ?? undefined}
                meta={`${p.weeks} week${p.weeks === 1 ? "" : "s"} · ${p._count.slots} session${p._count.slots === 1 ? "" : "s"}`}
              />
            ))}
          </Section>

          <Section title="Nutrition plans" count={user.nutritionTemplates.length}>
            {user.nutritionTemplates.map((n) => (
              <Row
                key={n.id}
                title={n.title}
                sub={
                  n.client
                    ? `Assigned to ${n.client.name}`
                    : "Library plan (unassigned)"
                }
                meta={`${n._count.meals} meal${n._count.meals === 1 ? "" : "s"}${n.targetCalories ? ` · ${n.targetCalories} kcal` : ""}`}
              />
            ))}
          </Section>

          <Section
            title="Assigned workouts"
            count={user._count.workoutsAsTrainer}
            shown={user.workoutsAsTrainer.length}
          >
            {user.workoutsAsTrainer.map((w) => (
              <Row
                key={w.id}
                href={`/admin/workouts/${w.id}`}
                title={w.title}
                sub={`For ${w.client.name}`}
                meta={`${formatDate(w.scheduledDate)} · ${w.status === "COMPLETED" ? "Completed" : "Assigned"}`}
              />
            ))}
          </Section>
        </>
      ) : (
        <Section
          title="Workouts assigned to them"
          count={user._count.workoutsAsClient}
          shown={user.workoutsAsClient.length}
        >
          {user.workoutsAsClient.map((w) => (
            <Row
              key={w.id}
              href={`/admin/workouts/${w.id}`}
              title={w.title}
              meta={`${formatDate(w.scheduledDate)} · ${w.status === "COMPLETED" ? "Completed" : "Assigned"}`}
            />
          ))}
        </Section>
      )}

      <Section title="Recent sign-ins" count={user.logins.length}>
        {user.logins.map((e) => {
          const known = toLoginOutcome(e.outcome);
          return (
            <div
              key={e.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
            >
              <Badge tone={known === LOGIN_OUTCOME.SUCCESS ? "jade" : "flag"}>
                {LOGIN_OUTCOME_LABELS[known]}
              </Badge>
              <p className="eyebrow flex-1 text-ink-soft">
                {e.method === LOGIN_METHOD.GOOGLE ? "Google" : "Password"}
              </p>
              <p className="metric text-xs text-ink-soft">
                {formatStamp(e.createdAt)}
              </p>
            </div>
          );
        })}
      </Section>

      <h2 className="mt-8 font-display text-lg font-semibold text-ink">
        Manage
      </h2>
      <div className="mt-3 flex flex-col gap-5">
        <AccountControls
          userId={user.id}
          name={user.name}
          email={user.email}
          role={user.role}
          trainerId={user.trainerId}
          trainers={trainers.filter((t) => t.id !== user.id)}
          isOwner={isOwnerEmail(user.email)}
          isAdmin={user.isAdmin}
          isSelf={user.id === admin.id}
          actorIsOwner={isOwnerEmail(admin.email)}
        />
        <DangerZone
          userId={user.id}
          email={user.email}
          name={user.name}
          removes={removes}
          orphans={isTrainer ? user.clients.length : 0}
          isSelf={user.id === admin.id}
          isOwner={isOwnerEmail(user.email)}
          isAdmin={isAdminUser(user)}
        />
      </div>
    </Container>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow text-ink-soft">{label}</p>
      <div className="mt-1 text-sm text-ink">{children}</div>
    </div>
  );
}

// `count` is the true total; `shown` is how many rows are rendered when the
// query was capped, so a truncated list says so rather than quietly lying.
function Section({
  title,
  count,
  shown,
  children,
}: {
  title: string;
  count: number;
  shown?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold text-ink">
        {title}{" "}
        <span className="metric text-sm font-normal text-ink-soft">{count}</span>
      </h2>
      {count === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">None.</p>
      ) : (
        <>
          <Card className="mt-3 divide-y divide-line">{children}</Card>
          {shown !== undefined && shown < count ? (
            <p className="mt-2 text-xs text-ink-soft">
              Showing the {shown} most recent.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function Row({
  href,
  title,
  sub,
  meta,
  children,
}: {
  href?: string;
  title: string;
  sub?: string;
  meta?: string;
  children?: React.ReactNode;
}) {
  const inner = (
    <>
      {children}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{title}</p>
        {sub ? <p className="truncate text-xs text-ink-soft">{sub}</p> : null}
      </div>
      {meta ? (
        <p className="metric shrink-0 text-xs text-ink-soft">{meta}</p>
      ) : null}
      {href ? <span className="text-ink-soft">›</span> : null}
    </>
  );

  const className = "flex items-center gap-3.5 px-4 py-3";
  return href ? (
    <Link href={href} className={`${className} transition-colors hover:bg-paper`}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}
