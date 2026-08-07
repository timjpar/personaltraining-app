// Pages both roles can open. Its own route group for the same reason (admin)
// has one: requireTrainer() and requireClient() each turn half the app's users
// away, and neither is the right gate for a reference page.
//
// The cost of being in neither group is that this layout has to rebuild
// whichever tab bar the visitor arrived with — hence src/lib/nav.ts, so the
// lists don't exist twice. Note src/proxy.ts also has to leave these paths out
// of both role areas, or it redirects one of them before the page is reached.
import { requireUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getThemePrefs } from "@/lib/theme-server";
import { AppHeader } from "@/components/AppHeader";
import { TimeZoneProbe } from "@/components/TimeZoneProbe";
import { trainerNav, clientNav } from "@/lib/nav";
import { ROLES } from "@/lib/constants";

export default async function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const isTrainer = user.role === ROLES.TRAINER;
  const { theme, accent, chosen } = await getThemePrefs();

  // The Activity badge is a trainer-only count, so a client never pays for it.
  const unread = isTrainer
    ? await prisma.feedItem.count({ where: { trainerId: user.id, read: false } })
    : 0;

  return (
    <div className="min-h-svh">
      <AppHeader
        name={user.name}
        roleLabel={isTrainer ? "Trainer" : "Athlete"}
        navItems={isTrainer ? trainerNav(unread) : clientNav()}
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
