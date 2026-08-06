import { cn } from "@/lib/cn";
import { buttonClass } from "./ui";

// A plain link, not a form: /api/auth/google is a GET that only mints a
// handshake cookie and redirects to Google. The CSRF protection for the flow
// is the state check on the way back, not on the way out.
export function GoogleButton({
  label = "Continue with Google",
}: {
  label?: string;
}) {
  return (
    <a
      href="/api/auth/google"
      className={cn(buttonClass("outline"), "w-full font-medium")}
    >
      <GoogleMark />
      {label}
    </a>
  );
}

// Kept next to the button because it only ever separates it from the email
// form below.
export function OrDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      <span className="eyebrow text-ink-soft/70">or</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

// Google's mark, at its own fixed colours in both themes — their branding
// terms don't allow recolouring it.
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.909c1.702-1.567 2.683-3.874 2.683-6.614z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.909-2.258c-.806.54-1.837.859-3.047.859-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71a5.41 5.41 0 0 1 0-3.42V4.958H.957a9 9 0 0 0 0 8.084l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.346l2.582-2.582C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
