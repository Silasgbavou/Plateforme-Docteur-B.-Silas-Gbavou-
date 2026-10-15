import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/plus-jakarta-sans/latin-400.css";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PwaRegistrar } from "@/components/site/PwaRegistrar";
import { baseMetadata } from "@/lib/server/site";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return baseMetadata();
}

export const viewport: Viewport = {
  themeColor: "#faf9f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <a className="skip-link" href="#contenu">Aller au contenu</a>
        <SiteHeader />
        <main id="contenu" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <PwaRegistrar />
      </body>
    </html>
  );
}
