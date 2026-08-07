// The tab bars, in one place. Three layouts render them now — (trainer),
// (client) and (shared) — and /exercises is the reason: it belongs to both
// roles, so its layout has to rebuild whichever bar the visitor already had.
// Two copies of these lists would have drifted the first time one gained an
// entry.
//
// Order is the order of the cells. The mobile bar is a flex row with no
// scroll (see AppHeader), so every addition costs the others width — labels
// stay short enough to survive seven cells at 375px.
import type { NavItem } from "@/components/AppHeader";

export function trainerNav(unread: number): NavItem[] {
  return [
    {
      href: "/dashboard",
      label: "Activity",
      icon: "dashboard",
      badge: unread || undefined,
    },
    { href: "/calendar", label: "Calendar", icon: "calendar" },
    { href: "/clients", label: "Clients", icon: "clients" },
    { href: "/library", label: "Workouts", icon: "workouts" },
    { href: "/programs", label: "Programs", icon: "programs" },
    { href: "/nutrition", label: "Nutrition", icon: "nutrition" },
    { href: "/exercises", label: "Exercises", icon: "exercises" },
  ];
}

export function clientNav(): NavItem[] {
  return [
    { href: "/my", label: "Today", icon: "today" },
    { href: "/my/calendar", label: "Calendar", icon: "calendar" },
    { href: "/my/nutrition", label: "Nutrition", icon: "nutrition" },
    { href: "/my/history", label: "History", icon: "history" },
    { href: "/exercises", label: "Exercises", icon: "exercises" },
  ];
}
