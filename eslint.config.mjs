import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "public/pdf.worker.min.mjs", "public/sw.js", "data/**", "storage/**", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
  ...next,
  ...ts,
  {
    rules: {
      // Images servies par nos propres routes (couvertures, portraits) avec width/height explicites :
      // l'optimiseur next/image n'apporte rien et ajouterait une dépendance d'exécution.
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
