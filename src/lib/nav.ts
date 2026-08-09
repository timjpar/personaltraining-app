// The tab bars, in one place. Two layouts render them — (trainer) and
// (client). They were three: /exercises used to be a page both roles read,
// which needed its own (shared) group and a layout that rebuilt whichever bar
// the visitor arrived with. It is trainer-only now, so the group is gone and
// each role's bar is built by that role's layout.
//
// Order is the order of the cells. The mobile bar scrolls horizontally (see
// AppHeader), which is what let the trainer's row go past seven cells — it was
// capped there while every cell had to be visible at 375px, and Messages was
// the addition that made a fixed row untenable.
//
// Cells still divide the width equally whenever they all fit, so scrolling is
// the exception rather than the new normal: the athlete's six fit a 375px
// screen, and it is the trainer's eight that actually scroll.
//
// Labels stay one short word regardless. A scrolling row makes a long label
// possible, not advisable: the cell width is what makes the row scannable, and
// "Nutrition" is already the longest thing that reads cleanly at this size.
import type { NavItem } from "@/components/AppHeader";

export function trainerNav(unread: number, unreadMessages: number): NavItem[] {
  return [
    {
      href: "/dashboard",
      label: "Activity",
      icon: "dashboard",
      badge: unread || undefined,
    },
    {
      href: "/messages",
      label: "Messages",
      icon: "messages",
      badge: unreadMessages || undefined,
    },
    { href: "/calendar", label: "Calendar", icon: "calendar" },
    { href: "/clients", label: "Clients", icon: "clients" },
    { href: "/library", label: "Workouts", icon: "workouts" },
    { href: "/programs", label: "Programs", icon: "programs" },
    { href: "/nutrition", label: "Nutrition", icon: "nutrition" },
    { href: "/exercises", label: "Exercises", icon: "exercises" },
  ];
}

export function clientNav(unreadMessages: number): NavItem[] {
  return [
    { href: "/my", label: "Today", icon: "today" },
    {
      href: "/my/messages",
      label: "Messages",
      icon: "messages",
      badge: unreadMessages || undefined,
    },
    { href: "/my/calendar", label: "Calendar", icon: "calendar" },
    { href: "/my/nutrition", label: "Nutrition", icon: "nutrition" },
    // Weighing in is a weekly action, and a tab is what keeps it one tap — a
    // card on /my would land below the workouts. "Body" is the shortest label
    // in the row, which is part of why the athlete's six still fit a 375px
    // screen without scrolling.
    { href: "/my/body", label: "Body", icon: "body" },
    { href: "/my/history", label: "History", icon: "history" },
  ];
}
