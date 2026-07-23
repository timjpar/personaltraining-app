import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Welcome back</h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Sign in to your Chalkline coaching workspace.
      </p>

      <div className="mt-8">
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
