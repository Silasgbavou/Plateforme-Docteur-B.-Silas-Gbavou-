import "server-only";
import type { Metadata } from "next";
import { env } from "./env";

/** Métadonnées : noindex global tant que l'audience est privée. */
export function baseMetadata(): Metadata {
  const e = env();
  const indexable = e.SITE_AUDIENCE === "public";
  return {
    metadataBase: new URL(e.SITE_URL),
    title: { default: "Docteur B. Silas Gbavou — Ministère d'Enseignement", template: "%s — Dr B. Silas Gbavou" },
    description: "Livres, enseignements prophétiques, spirituels et doctrinaux, et moteur d'étude sourcé du Ministère d'Enseignement du Docteur B. Silas Gbavou.",
    applicationName: "Ministère Dr B. Silas Gbavou",
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
    openGraph: { type: "website", locale: "fr_FR", siteName: "Ministère d'Enseignement Docteur B. Silas Gbavou" },
    formatDetection: { telephone: false },
    icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
  };
}

export const isPublicAudience = () => env().SITE_AUDIENCE === "public";
