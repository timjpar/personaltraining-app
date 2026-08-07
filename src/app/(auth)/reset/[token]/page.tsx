import Link from "next/link";
import { ResetForm } from "./ResetForm";
import { findResetTarget } from "@/lib/reset-token";

export default async function ResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Checked before anything is rendered. A form that only reveals the link is
  // dead after you've typed a password into it twice is a worse way to say
  // "expired" than not offering the form at all — and this read spends nothing,
  // so an honest look costs the token nothing either.
  const target = await findResetTarget(token);

  if (!target) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          That link has expired
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Reset links work once and last an hour. This one has been used already,
          or it&rsquo;s older than that.
        </p>

        <div className="mt-8">
          <Link
            href="/forgot"
            className="font-medium text-jade-strong hover:underline"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Choose a new password
      </h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        For <span className="metric">{target.email}</span>. Setting it signs you
        in here and signs out everywhere else.
      </p>

      <div className="mt-8">
        <ResetForm token={token} email={target.email} />
      </div>
    </div>
  );
}
