// Its own route group rather than a folder under (trainer), because access here
// is decided by ADMIN_EMAILS and the isAdmin column rather than by role — the
// trainer layout's requireTrainer() would be both too strict and beside the
// point.
import { requireAdmin, isOwnerEmail } from "@/lib/admin";
import { getThemePrefs } from "@/lib/theme-server";
import { AppHeader } from "@/components/AppHeader";
import { ROLES } from "@/lib/constants";
import { avatarUrl } from "@/lib/avatar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const { theme, accent, chosen } = await getThemePrefs();

  // Only trainers can be promoted, but an owner is whoever the environment
  // says, so the way back out is chosen from the role rather than assumed —
  // sending a client to /dashboard would have the proxy bounce them.
  const isTrainer = user.role === ROLES.TRAINER;

  return (
    <div className="min-h-svh">
      <AppHeader
        name={user.name}
        roleLabel={isOwnerEmail(user.email) ? "Owner" : "Admin"}
        photoUrl={avatarUrl(user)}
        navItems={[
          { href: "/admin", label: "Accounts", icon: "clients" },
          { href: "/admin/logins", label: "Sign-ins", icon: "history" },
          {
            href: isTrainer ? "/dashboard" : "/my",
            label: isTrainer ? "Coaching" : "Training",
            icon: isTrainer ? "dashboard" : "today",
          },
        ]}
        theme={theme}
        accent={accent}
        themeChosen={chosen}
      />
      {/* Clears the fixed tab bar so the last row of any page stays reachable. */}
      <main className="pb-tabbar lg:pb-0">{children}</main>
    </div>
  );
}
