import { requireUser } from "@/lib/auth";
import { Container, PageHeading, Card, ButtonLink } from "@/components/ui";
import { ExerciseFigure } from "@/components/ExerciseFigure";
import { archetypeFor, demoSearchUrl } from "@/lib/exercise-archetypes";
import { CLIMBING_GROUPS, CLIMBING_EXERCISE_NAMES } from "@/lib/climbing-presets";
import { ROLES } from "@/lib/constants";

// Anchors, so seven sections on a phone don't mean seven screens of scrolling
// to reach the one you came for.
function anchor(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function ClimbingPage() {
  // requireUser, not requireTrainer/requireClient: this is the one page both
  // roles share. A client reads it; a trainer programs from it.
  const user = await requireUser();
  const isTrainer = user.role === ROLES.TRAINER;

  return (
    <Container className="max-w-3xl">
      <PageHeading
        eyebrow="Training"
        title="Rock climbing"
        action={
          isTrainer ? (
            <ButtonLink href="/library/new" variant="outline" size="sm">
              Build a workout
            </ButtonLink>
          ) : undefined
        }
      >
        {CLIMBING_EXERCISE_NAMES.length} movements climbers actually train, with
        the protocol for each.{" "}
        {isTrainer
          ? "They're all in the exercise picker under “Rock Climbing”, so you can program any of them straight into a session."
          : "Tap any movement to see how it's done."}
      </PageHeading>

      {/* A contents row rather than a sidebar: it collapses to two lines on a
          phone and costs nothing on desktop. */}
      <nav
        aria-label="Sections"
        className="mt-6 flex flex-wrap gap-1.5 border-y border-line py-3"
      >
        {CLIMBING_GROUPS.map((g) => (
          <a
            key={g.label}
            href={`#${anchor(g.label)}`}
            className="eyebrow rounded-full border border-line px-2.5 py-1 text-ink-soft transition-colors hover:border-jade/30 hover:text-jade-strong"
          >
            {g.label}
          </a>
        ))}
      </nav>

      {CLIMBING_GROUPS.map((group) => (
        <section key={group.label} id={anchor(group.label)} className="mt-9 scroll-mt-20">
          <h2 className="font-display text-base font-semibold text-ink">
            {group.label}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{group.blurb}</p>

          <Card className="mt-3">
            <ul className="divide-y divide-line">
              {group.exercises.map((ex) => (
                <li key={ex.name} className="flex items-start gap-3 px-4 py-3.5">
                  <span className="mt-0.5 shrink-0 text-ink-soft">
                    <ExerciseFigure archetype={archetypeFor(ex.name)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* The same fallback the client workout page uses when a
                        trainer hasn't attached their own demo. */}
                    <a
                      href={demoSearchUrl(ex.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-ink transition-colors hover:text-jade-strong"
                    >
                      {ex.name}
                      <span aria-hidden className="ml-1 text-ink-soft">
                        ↗
                      </span>
                    </a>
                    <p className="mt-0.5 text-sm text-ink-soft">{ex.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}

      <p className="mt-9 text-xs text-ink-soft">
        Loads and rest here are conventional starting points, not a plan. Finger
        strength work in particular is where climbers get hurt — build into it
        slowly, and stop a set while it still looks clean.
      </p>
    </Container>
  );
}
