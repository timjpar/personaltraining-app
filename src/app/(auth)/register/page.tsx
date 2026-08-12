import Link from "next/link";
import { redirectIfSignedIn } from "@/lib/auth";

// Kept as a page rather than deleted, so the route says what happened. Every
// link that ever pointed here — an old email, a bookmark, the sign-in page's
// own footer for months — would otherwise land on a bare 404, which reads as
// "the app is broken" rather than "this isn't open yet". There is no form and
// no register action behind it any more; see (auth)/actions.ts.
export default async function RegisterPage() {
  await redirectIfSignedIn();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Chalkline is invite-only
      </h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        We&rsquo;re in a closed beta, so accounts are set up rather than signed
        up for.
      </p>

      <div className="mt-7 flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-card p-5 text-sm leading-relaxed text-ink-soft">
        <p>
          <span className="font-medium text-ink">Training with a coach?</span>{" "}
          They create your account and send you the sign-in details — ask them
          to add you.
        </p>
        <p>
          <span className="font-medium text-ink">Coaching on Chalkline?</span>{" "}
          Coach accounts are set up by an admin. Get in touch and we&rsquo;ll
          sort one out.
        </p>
      </div>

      <p className="mt-7 text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-jade-strong hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
