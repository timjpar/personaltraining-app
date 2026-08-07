import { requireTrainer } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getThemePrefs } from "@/lib/theme-server";
import { AppHeader } from "@/components/AppHeader";
import { trainerNav } from "@/lib/nav";

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
        navItems={trainerNav(unread)}
        theme={theme}
        accent={accent}
        themeChosen={chosen}
        adminHref={isAdminUser(user) ? "/admin" : undefined}
      />
      {/* Clears the fixed tab bar so the last row of any page stays reachable. */}
      <main className="pb-tabbar lg:pb-0">{children}</main>
    </div>
  );
}
