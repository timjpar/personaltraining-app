import { requireClient } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireClient();

  return (
    <div className="min-h-svh">
      <AppHeader
        name={user.name}
        roleLabel="Athlete"
        navItems={[
          { href: "/my", label: "Today" },
          { href: "/my/history", label: "History" },
        ]}
      />
      <main>{children}</main>
    </div>
  );
}
