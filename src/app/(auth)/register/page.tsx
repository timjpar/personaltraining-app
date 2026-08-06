import Link from "next/link";
import { RegisterForm } from "./RegisterForm";
import { GoogleButton, OrDivider } from "@/components/GoogleButton";

export default function RegisterPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Start coaching on Chalkline
      </h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Create your trainer workspace. You&rsquo;ll add your clients once
        you&rsquo;re in.
      </p>

      <div className="mt-8 flex flex-col gap-5">
        {/* Same route as on /login — Google itself decides whether this is a
            new account or an existing one. */}
        <GoogleButton label="Continue with Google" />
        <OrDivider />

        <RegisterForm />
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
