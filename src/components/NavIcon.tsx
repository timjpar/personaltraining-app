// Icons for the mobile tab bar. Drawn on one grid with one stroke weight so
// the row reads as a set: 20x20 box, 1.6 stroke, round caps and joins, and
// nothing sitting closer than 3px to the edge.
//
// Where the subject has its own object, the icon uses it — a loaded barbell
// for Workouts rather than a generic list. That is the whole vocabulary a
// coach already has, and it beats a document glyph at a glance.

export type IconName =
  | "dashboard"
  | "calendar"
  | "clients"
  | "workouts"
  | "programs"
  | "nutrition"
  | "today"
  | "history";

const paths: Record<IconName, React.ReactNode> = {
  // Activity — what came back from the athletes.
  dashboard: (
    <>
      <path d="M3 12.5h3l2.5-6 3 11 2.5-7.5h3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" />
      <path d="M3 8.5h14M7 3v3M13 3v3" />
    </>
  ),
  clients: (
    <>
      <circle cx="8" cy="7.5" r="2.75" />
      <path d="M3 16.5c0-2.5 2.2-4 5-4s5 1.5 5 4" />
      <path d="M14 5.6a2.6 2.6 0 010 4.8M15.2 13c1.3.6 2 1.9 2 3.5" />
    </>
  ),
  // A loaded barbell, read end-on: inner collars, outer plates, the bar.
  workouts: (
    <>
      <path d="M3 8v4M6 6.5v7M14 6.5v7M17 8v4M6 10h8" />
    </>
  ),
  // Stacked weeks — a program is sheets of sessions in order.
  programs: (
    <>
      <path d="M10 2.8 17.2 6.5 10 10.2 2.8 6.5z" />
      <path d="M3 10.5 10 14l7-3.5M3 14 10 17.5 17 14" />
    </>
  ),
  // A bowl. The first draft was a circle with a radius line, which at 20px was
  // indistinguishable from the History clock sitting two tabs away.
  nutrition: (
    <>
      <path d="M2.8 8.8h14.4a7.2 7.2 0 01-14.4 0z" />
      <path d="M7 5.6c0-1.2 1.3-1.6 1.3-2.8M11 5.6c0-1.2 1.3-1.6 1.3-2.8" />
    </>
  ),
  today: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M6.6 10.2 9 12.5l4.6-5" />
    </>
  ),
  history: (
    <>
      <path d="M3.2 8.6A7 7 0 1 1 3 11.2" />
      <path d="M3 4.5v4.2h4.2" />
      <path d="M10 6.4v4l2.6 1.7" />
    </>
  ),
};

export function NavIcon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
