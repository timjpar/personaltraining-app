// Converting and rendering masses and lengths. No physiology (that's body.ts),
// no Prisma, no React — so client components can import it freely.
//
// The one rule this file exists to enforce: bodies are stored canonical metric
// and UNROUNDED, and rounding happens here and nowhere else. Round on the way
// in and 165.0 lb comes back out as 164.9 lb, because 165 × 0.45359237 = 74.84…
// and a stored 74.8 converts back to 164.90. That drift is the bug that makes
// people stop trusting the numbers, and it is unrecoverable once written.
import { UNITS, type Units } from "@/lib/constants";

// Both exact by definition, not approximations.
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const kgFromLb = (lb: number) => lb * KG_PER_LB;
export const lbFromKg = (kg: number) => kg / KG_PER_LB;
export const cmFromIn = (inches: number) => inches * CM_PER_IN;
export const inFromCm = (cm: number) => cm / CM_PER_IN;

export const cmFromFeetIn = (feet: number, inches: number) =>
  cmFromIn(feet * 12 + inches);

// Height reads as feet and inches, so it needs its own split rather than a bare
// inch figure. Carries the 11.5″ → 12″ case up into the next foot: rounding
// first and dividing after is what produces "5′ 12″".
export function feetInFromCm(cm: number): { feet: number; inches: number } {
  const total = Math.round(inFromCm(cm));
  return { feet: Math.floor(total / 12), inches: total % 12 };
}

export const massUnit = (units: Units) =>
  units === UNITS.IMPERIAL ? "lb" : "kg";
export const lengthUnit = (units: Units) =>
  units === UNITS.IMPERIAL ? "in" : "cm";

const round1 = (n: number) => Math.round(n * 10) / 10;

// One decimal on masses and tape figures: a scale reads to 0.1, and a tenth of
// a kilo is the smallest change anyone acts on. Heights get none — nobody is
// 180.4 cm tall in any useful sense.
export function massValue(kg: number, units: Units): number {
  return round1(units === UNITS.IMPERIAL ? lbFromKg(kg) : kg);
}

export function lengthValue(cm: number, units: Units): number {
  return round1(units === UNITS.IMPERIAL ? inFromCm(cm) : cm);
}

export function massLabel(kg: number | null | undefined, units: Units): string {
  if (kg == null) return "—";
  return `${massValue(kg, units).toFixed(1)} ${massUnit(units)}`;
}

export function lengthLabel(
  cm: number | null | undefined,
  units: Units,
): string {
  if (cm == null) return "—";
  return `${lengthValue(cm, units).toFixed(1)} ${lengthUnit(units)}`;
}

export function heightLabel(
  cm: number | null | undefined,
  units: Units,
): string {
  if (cm == null) return "—";
  if (units === UNITS.IMPERIAL) {
    const { feet, inches } = feetInFromCm(cm);
    return `${feet}′ ${inches}″`;
  }
  return `${Math.round(cm)} cm`;
}

// A signed change, for the "down 2.4 kg" line. Always shows the sign — an
// unsigned delta next to a goal is ambiguous in the one place it matters.
export function massDeltaLabel(kgDelta: number, units: Units): string {
  const v = massValue(Math.abs(kgDelta), units);
  const sign = kgDelta > 0 ? "+" : kgDelta < 0 ? "−" : "";
  return `${sign}${v.toFixed(1)} ${massUnit(units)}`;
}

// Values for a number input, in the viewer's unit. Empty string rather than
// "0" for null, so an untouched field submits as blank and parses back to null
// instead of writing a zero nobody typed.
export function massInput(kg: number | null | undefined, units: Units): string {
  return kg == null ? "" : String(massValue(kg, units));
}

export function lengthInput(
  cm: number | null | undefined,
  units: Units,
): string {
  return cm == null ? "" : String(lengthValue(cm, units));
}

// Height is two boxes in imperial and one in metric, so the form asks for the
// parts rather than a single value. All three come back regardless and the
// caller renders whichever pair it is showing — there is nothing to decide
// here, which is why this one takes no Units.
export function heightInputs(
  cm: number | null | undefined,
): { cm: string; feet: string; inches: string } {
  if (cm == null) return { cm: "", feet: "", inches: "" };
  const { feet, inches } = feetInFromCm(cm);
  return { cm: String(Math.round(cm)), feet: String(feet), inches: String(inches) };
}
