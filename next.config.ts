import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-postgres does an optional runtime require of the native `pg-native`
  // binding; keeping it out of the server bundle avoids a resolve failure.
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
};

export default nextConfig;
