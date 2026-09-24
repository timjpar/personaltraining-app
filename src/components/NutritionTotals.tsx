// The totals block every nutrition surface opens with: a heading, the
// micronutrient switch, the macro strip, and — once someone has asked for
// them — the micronutrients. One component because five surfaces draw it
// (plan, checkoff, day log, the log form, the builder), and the switch has to
// sit in the same place on all of them to be findable.
import { MacroBar } from "@/components/MacroBar";
import { NutrientDetailToggle } from "@/components/NutrientDetailToggle";
import { NutrientPanel } from "@/components/NutrientPanel";
import { NUTRIENT_DETAIL, type NutrientDetail } from "@/lib/constants";
import type { MacroTotals } from "@/lib/nutrition-form";
import type { NutrientTotals } from "@/lib/nutrients";

export function NutritionTotals({
  label,
  totals,
  targets,
  nutrients,
  detail,
  className,
}: {
  label: string;
  totals: MacroTotals;
  targets?: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
  nutrients: NutrientTotals;
  detail: NutrientDetail;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="eyebrow text-ink-soft">{label}</p>
        <NutrientDetailToggle value={detail} />
      </div>
      <MacroBar totals={totals} targets={targets} />
      {detail !== NUTRIENT_DETAIL.OFF ? (
        <NutrientPanel totals={nutrients} detail={detail} className="mt-2.5" />
      ) : null}
    </div>
  );
}
