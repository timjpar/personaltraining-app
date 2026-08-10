import Link from "next/link";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading } from "@/components/ui";
import { ClientProfileForm } from "@/components/ClientProfileForm";
import { SuggestedTargets } from "@/components/SuggestedTargets";
import { UnitsToggle } from "@/components/UnitsToggle";
import { saveMyProfile } from "../actions";
import { toDateInput } from "@/lib/format";
import { toUnits } from "@/lib/constants";

// The coach's own intake file, and the calorie suggestion it earns — the same
// pairing /clients/[id]/profile makes, and for the same reason: filling the form
// in is what makes the number appear, and watching it move is what makes filling
// the form in worth doing.
//
// Weigh-ins stay on their own route here too. They're written weekly and this is
// written once and edited rarely, so one page would put the frequent thing below
// the rare one.
//
// The one thing this page does that the client version can't: the suggested
// targets are the end of the line rather than something to accept into a plan.
// There is nobody to assign a plan to, so the numbers simply become what the
// coach's own food log measures each day against — see SuggestedTargets and
// me/nutrition/day.tsx, which derive them from exactly this file.
export default async function MyOwnProfilePage() {
  const trainer = await requireTrainer();

  const [profile, latest] = await Promise.all([
    prisma.clientProfile.findUnique({ where: { userId: trainer.id } }),
    prisma.measurement.findFirst({
      where: { clientId: trainer.id, weightKg: { not: null } },
      orderBy: { date: "desc" },
      select: { weightKg: true, date: true },
    }),
  ]);

  const units = toUnits(trainer.units);

  return (
    <Container>
      <Link
        href="/me"
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ You
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow="Your file"
          title="Profile"
          action={<UnitsToggle value={units} />}
        >
          The same details you keep on an athlete, kept on yourself. Nobody else
          sees this.
        </PageHeading>
      </div>

      <div className="mt-6">
        <SuggestedTargets profile={profile} latest={latest} units={units} self />
      </div>

      <div className="mt-8">
        <ClientProfileForm
          action={saveMyProfile}
          units={units}
          self
          values={{
            sex: profile?.sex ?? null,
            birthDate: profile?.birthDate ? toDateInput(profile.birthDate) : "",
            heightCm: profile?.heightCm ?? null,
            activityLevel: profile?.activityLevel ?? null,
            goalType: profile?.goalType ?? null,
            goalWeightKg: profile?.goalWeightKg ?? null,
            rateKgPerWeek: profile?.rateKgPerWeek ?? null,
            trainingDaysPerWeek: profile?.trainingDaysPerWeek ?? null,
            experience: profile?.experience ?? null,
            trainingLocation: profile?.trainingLocation ?? null,
            equipmentNotes: profile?.equipmentNotes ?? null,
            injuries: profile?.injuries ?? null,
            dietPattern: profile?.dietPattern ?? null,
            allergies: profile?.allergies ?? null,
            dietaryNotes: profile?.dietaryNotes ?? null,
            mealsPerDay: profile?.mealsPerDay ?? null,
            notes: profile?.notes ?? null,
          }}
        />
      </div>
    </Container>
  );
}
