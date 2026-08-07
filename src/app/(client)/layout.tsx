import { requireClient } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { getThemePrefs } from "@/lib/theme-server";
import { AppHeader } from "@/components/AppHeader";
import { TimeZoneProbe } from "@/components/TimeZoneProbe";
import { clientNav } from "@/lib/nav";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireClient();
  const { theme, accent, chosen } = await getThemePrefs();

  return (
    <div className="min-h-svh">
      <AppHeader
        name={user.name}
        roleLabel="Athlete"
        navItems={clientNav()}
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
