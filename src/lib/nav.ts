// The tab bars, in one place. Two layouts render them — (trainer) and
// (client). They were three: /exercises used to be a page both roles read,
// which needed its own (shared) group and a layout that rebuilt whichever bar
// the visitor arrived with. It is trainer-only now, so the group is gone and
// each role's bar is built by that role's layout.
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
  ];
}
