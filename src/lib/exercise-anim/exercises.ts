// Every animated exercise, in one list.

import { CARDIO } from "./ex-cardio";
import { CLIMB } from "./ex-climb";
import { CORE } from "./ex-core";
import { LEGS } from "./ex-legs";
import { MOBILITY } from "./ex-mobility";
import { OLYMPIC } from "./ex-olympic";
import { PULL } from "./ex-pull";
import { PRESS_DRILLS } from "./ex-press";
import { PUSH } from "./ex-push";
import type { Spec } from "./render";

export const SPECS: Spec[] = [...LEGS, ...PUSH, ...PULL, ...CARDIO, ...OLYMPIC, ...CORE, ...PRESS_DRILLS, ...MOBILITY, ...CLIMB];
