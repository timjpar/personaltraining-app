import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { PrescriptionCard } from "@/components/PrescriptionCard";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Send genuinely signed-in visitors to their own area. This looks the account
  // up rather than trusting the cookie, so a session for a deleted account falls
  // through to the form instead of bouncing — signing in replaces the cookie.
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === ROLES.TRAINER ? "/dashboard" : "/my");
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      {/* Left: the thesis — a live program sheet closing the loop. */}
      <aside className="relative hidden overflow-hidden bg-steel px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="gridfield pointer-events-none absolute inset-0 opacity-[0.6]" />
        <div className="relative">
          <Wordmark light />
        </div>

        <div className="relative flex flex-col gap-8">
          <div>
            <p className="eyebrow text-jade-wash/80">The program sheet, live</p>
            <h1 className="mt-3 max-w-md font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight">
              Write the training. Watch it get done.
            </h1>
            <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-white/65">
              Program a session, and the moment your client logs the last set it
              lands on your dashboard — reps, load, and how hard it felt.
            </p>
          </div>

          <div className="max-w-sm">
            <PrescriptionCard
              index={1}
              name="Back Squat"
              metrics={[
                { label: "Sets", value: "4" },
                { label: "Reps", value: "5" },
                { label: "Load", value: "70%" },
                { label: "Tempo", value: "31X1" },
                { label: "Rest", value: "2:30" },
              ]}
              notes="Leave one rep in the tank on the top set."
            />
            <div className="mt-3 flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-white/10 bg-white/5 px-3.5 py-2.5">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-jade text-white">
                <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M4 11 L8 15 L16 5"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className="text-sm text-white/80">
                <span className="font-medium text-white">Maria</span> logged Lower
                Body A — <span className="metric">RPE 8</span>
              </p>
            </div>
          </div>
        </div>

        <p className="eyebrow relative text-white/35">
          Coaching that closes the loop
        </p>
      </aside>

      {/* Right: the form. */}
      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-9 lg:hidden">
            <Wordmark />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
