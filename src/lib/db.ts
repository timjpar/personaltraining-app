import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 uses driver adapters instead of a bundled query engine. We talk to
// Postgres through node-postgres, which works the same locally and on a hosted
// deploy — no local database file, so nothing depends on a writable disk.
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and point it at a " +
      "Postgres database (see the README).",
  );
}

function createPrisma() {
  // A small pool: serverless platforms run many short-lived instances, and each
  // one holds its own pool, so a large per-instance pool exhausts the database's
  // connection limit fast. Prefer the provider's pooled connection string.
  const adapter = new PrismaPg({ connectionString: url, max: 5 });
  return new PrismaClient({ adapter });
}

// Reuse a single client across hot reloads in dev.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrisma>;
};

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
