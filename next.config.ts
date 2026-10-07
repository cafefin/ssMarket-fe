import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

const nextConfig: NextConfig = {
  // Produces a self-contained server for the Docker image.
  output: "standalone",
};

export default withNextIntl(nextConfig);
