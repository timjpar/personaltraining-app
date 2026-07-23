import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  return (
    <div className="min-h-svh">
      <AppHeader
        name={user.name}
        roleLabel="Trainer"
        navItems={[
          { href: "/dashboard", label: "Dashboard", badge: unread || undefined },
          { href: "/clients", label: "Clients" },
        ]}
      />
      <main>{children}</main>
    </div>
  );
}
