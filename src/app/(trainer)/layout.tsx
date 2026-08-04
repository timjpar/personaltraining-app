import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getThemePrefs } from "@/lib/theme-server";
import { AppHeader } from "@/components/AppHeader";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireTrainer();
  const unread = await prisma.feedItem.count({
    where: { trainerId: user.id, read: false },
  });
  const { theme, accent, chosen } = await getThemePrefs();

  return (
    <div className="min-h-svh">
      <AppHeader
        name={user.name}
        roleLabel="Trainer"
        navItems={[
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
        ]}
        theme={theme}
        accent={accent}
        themeChosen={chosen}
      />
      {/* Clears the fixed tab bar so the last row of any page stays reachable. */}
      <main className="pb-tabbar sm:pb-0">{children}</main>
    </div>
  );
}
