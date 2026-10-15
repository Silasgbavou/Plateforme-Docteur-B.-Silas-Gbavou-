import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
import { env } from "@/lib/server/env";

export default function robots(): MetadataRoute.Robots {
  const e = env();
  if (e.SITE_AUDIENCE !== "public") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/gestion", "/api/", "/discussion", "/lecture/", "/hors-ligne"] }],
    sitemap: `${e.SITE_URL}/sitemap.xml`,
  };
}
