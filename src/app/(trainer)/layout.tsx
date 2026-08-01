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
          { href: "/dashboard", label: "Dashboard", badge: unread || undefined },
          { href: "/clients", label: "Clients" },
          { href: "/library", label: "Workouts" },
          { href: "/programs", label: "Programs" },
          { href: "/nutrition", label: "Nutrition" },
        ]}
        theme={theme}
        accent={accent}
        themeChosen={chosen}
      />
      <main>{children}</main>
    </div>
  );
}
