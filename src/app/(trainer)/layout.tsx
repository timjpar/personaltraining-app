import { requireTrainer } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getThemePrefs } from "@/lib/theme-server";
import { AppHeader } from "@/components/AppHeader";
import { TimeZoneProbe } from "@/components/TimeZoneProbe";
import { trainerNav } from "@/lib/nav";
import { unreadMessageCount } from "@/lib/messaging";
import { avatarUrl } from "@/lib/avatar";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireTrainer();
  const [unread, unreadMessages] = await Promise.all([
    prisma.feedItem.count({ where: { trainerId: user.id, read: false } }),
    unreadMessageCount(user.id),
  ]);
  const { theme, accent, chosen } = await getThemePrefs();

  return (
    <div className="min-h-svh">
      <AppHeader
        name={user.name}
        roleLabel="Trainer"
        photoUrl={avatarUrl(user)}
        navItems={trainerNav(unread, unreadMessages)}
        theme={theme}
        accent={accent}
        themeChosen={chosen}
        adminHref={isAdminUser(user) ? "/admin" : undefined}
      />
      <TimeZoneProbe current={user.timeZone} />
      {/* Clears the fixed tab bar so the last row of any page stays reachable. */}
      <main className="pb-tabbar lg:pb-0">{children}</main>
    </div>
  );
}
