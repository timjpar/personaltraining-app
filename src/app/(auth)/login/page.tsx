import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { GoogleButton, OrDivider } from "@/components/GoogleButton";
import { FormError } from "@/components/ui";
import { googleErrorMessage } from "@/lib/google";

export default async function LoginPage({
  searchParams,
}: {
  // A Google sign-in that doesn't complete lands back here as ?error=<code>.
  // The route handlers redirect rather than render, so a query param is the
  // only channel they have to say what went wrong.
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const googleError = googleErrorMessage(error);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Welcome back</h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Sign in to your Chalkline coaching workspace.
      </p>

      <div className="mt-8 flex flex-col gap-5">
        {googleError ? <FormError>{googleError}</FormError> : null}

        {/* Rendered whether or not the server has Google credentials. Hiding it
            when unconfigured only makes a missing environment variable look
            like missing code; pressing it says so plainly instead. */}
        <GoogleButton label="Sign in with Google" />
        <OrDivider />

        <LoginForm />
      </div>

      <p className="mt-7 text-sm text-ink-soft">
        New here?{" "}
        <Link href="/register" className="font-medium text-jade-strong hover:underline">
          Create a trainer account
        </Link>
      </p>
    </div>
  );
}
