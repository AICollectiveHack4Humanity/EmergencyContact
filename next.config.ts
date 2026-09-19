import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // falkordb (redis client + binary protocol) must be required at runtime,
  // not bundled: bundling breaks its Buffer/BigInt internals at build time.
  serverExternalPackages: ["falkordb"],
};

export default nextConfig;
