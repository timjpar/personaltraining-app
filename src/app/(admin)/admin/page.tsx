import Link from "next/link";
import { requireAdmin, isOwnerEmail } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card, Avatar, Badge } from "@/components/ui";
import { avatarUrl } from "@/lib/avatar";
import { addDays, formatStamp, relativeTime } from "@/lib/format";
import {
  LOGIN_OUTCOME,
  ROLES,
  SIGNUP_SOURCE_LABELS,
  toSignupSource,
} from "@/lib/constants";
import { AddTrainerForm } from "./AddTrainerForm";

// Every read here crosses tenant boundaries on purpose — this is the one place
// in the app that isn't scoped to a single trainer.
export default async function AdminAccountsPage() {
  await requireAdmin();

  const weekAgo = addDays(new Date(), -7);

  const [users, recentSuccess, recentFailed] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        trainer: { select: { id: true, name: true } },
        _count: {
          select: {
            clients: true,
            workoutsAsTrainer: true,
            templates: true,
            programs: true,
            nutritionTemplates: true,
          },
        },
      },
    }),
    prisma.loginEvent.count({
      where: { createdAt: { gte: weekAgo }, outcome: LOGIN_OUTCOME.SUCCESS },
    }),
    prisma.loginEvent.count({
      where: { createdAt: { gte: weekAgo }, outcome: { not: LOGIN_OUTCOME.SUCCESS } },
    }),
  ]);

  const trainers = users.filter((u) => u.role === ROLES.TRAINER).length;

  return (
    <Container>
      <PageHeading eyebrow="Owner" title="Accounts">
        Everyone with an account, what they signed up with, and what they&rsquo;ve
        built. Open one to edit it, set a new password, or change what it can
        reach.
      </PageHeading>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accounts" value={users.length} />
        <Stat label="Trainers" value={trainers} />
        <Stat label="Clients" value={users.length - trainers} />
        <Stat
          label="Sign-ins, 7d"
          value={recentSuccess}
          note={recentFailed ? `${recentFailed} failed` : undefined}
        />
      </div>

      {/* Above the list rather than below it. Chalkline is invite-only, so this
          form is the only door a coach comes through — and this page is where
          whoever holds the key already is. */}
      <div className="mt-6 max-w-md">
        <AddTrainerForm />
      </div>

      <Card className="mt-6 divide-y divide-line">
        {users.map((u) => {
          const built =
            u._count.workoutsAsTrainer +
            u._count.templates +
            u._count.programs +
            u._count.nutritionTemplates;
          return (
            <Link
              key={u.id}
              href={`/admin/users/${u.id}`}
              className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-paper"
            >
              <Avatar name={u.name} src={avatarUrl(u)} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                  {u.name}
                  <Badge tone={u.role === ROLES.TRAINER ? "jade" : "neutral"}>
                    {u.role === ROLES.TRAINER ? "Trainer" : "Client"}
                  </Badge>
                  {isOwnerEmail(u.email) ? (
                    <Badge tone="amber">Owner</Badge>
                  ) : u.isAdmin ? (
                    <Badge tone="amber">Admin</Badge>
                  ) : null}
                  {/* Only the awkward cases are badged. "Has a password" is
                      the ordinary state and badging it would put a label on
                      every row that nobody ever needs to read. */}
                  {!u.passwordHash ? (
                    <Badge tone={u.googleId ? "neutral" : "flag"}>
                      {u.googleId ? "Google only" : "No password"}
                    </Badge>
                  ) : null}
                </p>
                <p className="metric truncate text-xs text-ink-soft">{u.email}</p>
                <p className="mt-1 truncate text-xs text-ink-soft">
                  {SIGNUP_SOURCE_LABELS[toSignupSource(u.signupSource)]} ·{" "}
                  {formatStamp(u.createdAt)}
                  {u.trainer ? ` · coached by ${u.trainer.name}` : ""}
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="metric text-xs text-ink-soft">
                  {u.lastLoginAt
                    ? `Seen ${relativeTime(u.lastLoginAt)}`
                    : "Never signed in"}
                </p>
                <p className="metric text-xs text-ink-soft">
                  {u.role === ROLES.TRAINER
                    ? `${u._count.clients} client${u._count.clients === 1 ? "" : "s"} · ${built} item${built === 1 ? "" : "s"}`
                    : `${built} item${built === 1 ? "" : "s"}`}
                </p>
              </div>
              <span className="text-ink-soft">›</span>
            </Link>
          );
        })}
      </Card>
    </Container>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <Card className="px-4 py-3.5">
      <p className="eyebrow text-ink-soft">{label}</p>
      <p className="metric mt-1 font-display text-2xl font-semibold text-ink">
        {value}
      </p>
      {note ? <p className="metric text-xs text-flag">{note}</p> : null}
    </Card>
  );
}
