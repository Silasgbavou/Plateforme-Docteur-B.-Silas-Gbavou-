import type { MetadataRoute } from "next";
import { env } from "@/lib/server/env";
import { listPublishedWorks } from "@/lib/server/catalog";
import { listArticles } from "@/lib/server/articles";
import { listVideos } from "@/lib/server/videos";
import { PILLARS } from "@/lib/domain/pillars";

export const dynamic = "force-dynamic";

/** Uniquement les pages publiques, et seulement si l'audience est publique. */
export default function sitemap(): MetadataRoute.Sitemap {
  const e = env();
  if (e.SITE_AUDIENCE !== "public") return [];
  const u = (p: string) => `${e.SITE_URL}${p}`;
  return [
    ...["/", "/bibliotheque", "/enseignements", "/etude", "/videos", "/ecrits", "/confidentialite"].map((p) => ({ url: u(p) })),
    ...PILLARS.map((p) => ({ url: u(`/enseignements/${p.id}`) })),
    ...listPublishedWorks().map((w) => ({ url: u(`/ouvrages/${w.id}`) })),
    ...listArticles(true).map((a) => ({ url: u(`/ecrits/${a.slug}`) })),
    ...listVideos(true).map((v) => ({ url: u(`/videos/${v.id}`) })),
  ];
}
