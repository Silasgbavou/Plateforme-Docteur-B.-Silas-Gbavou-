import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ministère d'Enseignement — Docteur B. Silas Gbavou",
    short_name: "Dr B. S. Gbavou",
    description: "Livres, enseignements et moteur d'étude du Ministère d'Enseignement du Docteur B. Silas Gbavou.",
    lang: "fr",
    dir: "ltr",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#faf9f6",
    theme_color: "#0b2545",
    categories: ["books", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Bibliothèque", url: "/bibliotheque" },
      { name: "Étude", url: "/etude" },
    ],
  };
}
