import { requireClient } from "@/lib/auth";
import { getThemePrefs } from "@/lib/theme-server";
import { AppHeader } from "@/components/AppHeader";

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
        navItems={[
          { href: "/my", label: "Today", icon: "today" },
          { href: "/my/nutrition", label: "Nutrition", icon: "nutrition" },
          { href: "/my/history", label: "History", icon: "history" },
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
