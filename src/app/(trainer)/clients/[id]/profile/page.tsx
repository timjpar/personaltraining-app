import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container, PageHeading } from "@/components/ui";
import { ClientProfileForm } from "@/components/ClientProfileForm";
import { SuggestedTargets } from "@/components/SuggestedTargets";
import { UnitsToggle } from "@/components/UnitsToggle";
import {
  saveClientProfile,
  applyTargetsToPlan,
} from "@/app/(trainer)/clients/body-actions";
import { toDateInput } from "@/lib/format";
import { toUnits } from "@/lib/constants";

// The intake file, and the calorie suggestion it earns.
//
// The two live on one page deliberately: filling the form in is what makes the
// number appear, and watching it move is what makes filling the form in worth
// doing. Weigh-ins get their own route — they're written weekly, this is
// written once and edited rarely, and one page would put the frequent thing
// below the rare one.
export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainer = await requireTrainer();

  // Each query carries its own trainer scope rather than leaning on the client
  // lookup having succeeded, the same rule the client detail page follows.
  const [client, profile, latest, plan] = await Promise.all([
    prisma.user.findFirst({
      where: { id, trainerId: trainer.id, role: "CLIENT" },
      select: { id: true, name: true },
    }),
    prisma.clientProfile.findFirst({
      where: { userId: id, user: { trainerId: trainer.id } },
    }),
    prisma.measurement.findFirst({
      where: {
        clientId: id,
        client: { trainerId: trainer.id },
        weightKg: { not: null },
      },
      orderBy: { date: "desc" },
      select: { weightKg: true, date: true },
    }),
    prisma.nutritionPlan.findFirst({
      where: { clientId: id, trainerId: trainer.id },
      orderBy: { assignedAt: "desc" },
      select: { id: true, title: true },
    }),
  ]);

  if (!client) notFound();

  const units = toUnits(trainer.units);

  return (
    <Container>
      <Link
        href={`/clients/${client.id}`}
        className="metric -ml-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-xs text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1"
      >
        ‹ {client.name}
      </Link>

      <div className="mt-3">
        <PageHeading
          eyebrow="Profile"
          title={`${client.name.split(/\s+/)[0]}’s file`}
          action={<UnitsToggle value={units} />}
        >
          What a meal plan and a training block get written from.
        </PageHeading>
      </div>

      <div className="mt-6">
        <SuggestedTargets
          profile={profile}
          latest={latest}
          clientId={client.id}
          clientName={client.name}
          units={units}
          plan={plan}
          applyAction={applyTargetsToPlan.bind(null, client.id)}
        />
      </div>

      <div className="mt-8">
        <ClientProfileForm
          action={saveClientProfile.bind(null, client.id)}
          units={units}
          values={{
            sex: profile?.sex ?? null,
            birthDate: profile?.birthDate
              ? toDateInput(profile.birthDate)
              : "",
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
