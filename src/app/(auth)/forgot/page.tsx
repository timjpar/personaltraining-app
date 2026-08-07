import Link from "next/link";
import { ForgotForm } from "./ForgotForm";
import { redirectIfSignedIn } from "@/lib/auth";
import { mailConfig } from "@/lib/mail";

export default async function ForgotPage() {
  await redirectIfSignedIn();

  // Checked at render rather than only in the action, so a server with no mail
  // credentials says what to do instead of accepting an address and silently
  // sending nothing. Same posture as the Google button, one step further: there
  // is a real alternative here, and it's worth naming.
  const configured = mailConfig() !== null;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Reset your password
      </h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        {configured
          ? "We'll email you a link to choose a new one."
          : "This server can't send email yet."}
      </p>

      <div className="mt-8 flex flex-col gap-5">
        {configured ? (
          <ForgotForm />
        ) : (
          <p className="rounded-[var(--radius-sm)] border border-line bg-paper px-3.5 py-3 text-sm text-ink-soft">
            Password resets by email aren&rsquo;t set up on this server. Ask your
            trainer to reset your password for you — they can do it from your
            client page and read you the new one.
          </p>
        )}
      </div>

      <p className="mt-7 text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-jade-strong hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
