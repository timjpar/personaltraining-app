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
          { href: "/my", label: "Today" },
          { href: "/my/nutrition", label: "Nutrition" },
          { href: "/my/history", label: "History" },
        ]}
        theme={theme}
        accent={accent}
        themeChosen={chosen}
      />
      <main>{children}</main>
    </div>
  );
}
