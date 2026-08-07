import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Container, PageHeading, Card, Badge, EmptyState } from "@/components/ui";
import { formatStamp } from "@/lib/format";
import {
  LOGIN_METHOD_LABELS,
  LOGIN_OUTCOME,
  LOGIN_OUTCOME_LABELS,
  LOGIN_OUTCOME_ORDER,
  toLoginMethod,
  toLoginOutcome,
} from "@/lib/constants";

// Enough to cover a long look back without paginating. If this ever runs out,
// the email filter narrows it before a page-2 link becomes worth building.
const LIMIT = 200;

export default async function AdminLoginsPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string; email?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  // Only an outcome we actually know becomes a filter — an unrecognised value
  // in the query string shows everything rather than silently matching nothing.
  const outcome = (LOGIN_OUTCOME_ORDER as readonly string[]).includes(
    params.outcome ?? "",
  )
    ? params.outcome
    : undefined;
  const email = (params.email ?? "").trim();

  const events = await prisma.loginEvent.findMany({
    where: {
      ...(outcome ? { outcome } : {}),
      ...(email ? { email: { contains: email, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    include: { user: { select: { id: true, name: true } } },
  });

  return (
    <Container>
      <PageHeading eyebrow="Owner" title="Sign-ins">
        Every attempt against the app, successful or not. Newest first.
      </PageHeading>

      {/* A GET form: the filter lives in the URL, so a filtered view is a link
          you can keep. */}
      <form method="get" className="mt-6 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="email"
          defaultValue={email}
          placeholder="Filter by email"
          aria-label="Filter by email"
          className="min-h-11 min-w-52 flex-1 rounded-[var(--radius-sm)] border border-line bg-card px-3.5 text-sm text-ink placeholder:text-ink-soft/60 focus-visible:border-jade focus-visible:outline-none"
        />
        <select
          name="outcome"
          defaultValue={outcome ?? ""}
          aria-label="Filter by outcome"
          className="min-h-11 cursor-pointer rounded-[var(--radius-sm)] border border-line bg-card px-3.5 pr-8 text-sm text-ink focus-visible:border-jade focus-visible:outline-none"
        >
          <option value="">Every outcome</option>
          {LOGIN_OUTCOME_ORDER.map((o) => (
            <option key={o} value={o}>
              {LOGIN_OUTCOME_LABELS[o]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-11 rounded-[var(--radius-sm)] border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-paper"
        >
          Filter
        </button>
        {outcome || email ? (
          <Link
            href="/admin/logins"
            className="min-h-11 content-center px-2 text-sm text-ink-soft hover:text-ink"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {events.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nothing recorded">
            {outcome || email
              ? "No sign-in attempts match that filter."
              : "Sign-in attempts will appear here as they happen."}
          </EmptyState>
        </div>
      ) : (
        <Card className="mt-6 divide-y divide-line">
          {events.map((e) => {
            const known = toLoginOutcome(e.outcome);
            const ok = known === LOGIN_OUTCOME.SUCCESS;
            return (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
              >
                <Badge tone={ok ? "jade" : "flag"}>
                  {LOGIN_OUTCOME_LABELS[known]}
                </Badge>
                <p className="metric min-w-0 flex-1 truncate text-sm text-ink">
                  {/* The account is a link only when the attempt resolved to
                      one. A deleted account keeps its rows but loses the id. */}
                  {e.user ? (
                    <Link
                      href={`/admin/users/${e.user.id}`}
                      className="hover:text-jade-strong"
                    >
                      {e.email}
                    </Link>
                  ) : (
                    e.email
                  )}
                </p>
                <p className="eyebrow text-ink-soft">
                  {LOGIN_METHOD_LABELS[toLoginMethod(e.method)]}
                </p>
                <p className="metric shrink-0 text-xs text-ink-soft">
                  {formatStamp(e.createdAt)}
                </p>
              </div>
            );
          })}
        </Card>
      )}

      {events.length === LIMIT ? (
        <p className="mt-3 text-xs text-ink-soft">
          Showing the most recent {LIMIT}. Filter by email to look further back.
        </p>
      ) : null}
    </Container>
  );
}
