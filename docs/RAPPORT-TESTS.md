# Rapport de tests — 13 octobre 2026

Environnement : conteneur Linux, Node 22.22, Chromium Playwright (build 1194), build de production Next 16.4.
Fournisseur IA **simulé** (aucun appel réel à Google ou OpenAI). Données de test neutres générées
(aucun texte d'auteur, aucune donnée personnelle réelle).

## Résultats

| Suite | Commande | Résultat |
|---|---|---|
| Types | `pnpm typecheck` | 0 erreur |
| Lint | `pnpm lint` | 0 erreur, 0 avertissement |
| Unitaires + intégration (7 fichiers) | `pnpm test` | **66 / 66** |
| E2E Playwright | `pnpm test:e2e` | **32 / 32** |
| Build production | `pnpm build` | réussi, 41 routes |
| Sauvegarde/restauration | `pnpm backup` + `pnpm restore:check` | sain : OK ; fichier altéré : détecté (code 1) |

## Défauts trouvés par les tests et corrigés

1. L'installation initiale du service worker rechargeait la page → saisie perdue (test de régression ajouté).
2. Pages publiques jamais disponibles hors ligne (en-tête `no-store` de Next).
3. Citations exactes rejetées à cause des espaces typographiques français autour des guillemets.
4. Débordement du nom d'auteur sur les reliures étroites (contraste signalé par axe).
5. Avertissement PDF.js côté serveur (polices standard).

## Mesures de laboratoire (localhost, mobile 390×844, sans bridage réseau ni CPU)

| Page | JS transféré (gzip) | Polices | LCP | CLS |
|---|---|---|---|---|
| `/` | 145 Ko | 72 Ko | 420 ms | 0,042 |
| `/bibliotheque` | 145 Ko | 48 Ko | 228 ms | 0 |
| `/etude` | 151 Ko | 61 Ko | 192 ms | 0,029 |
| `/lecture/…` (PDF.js chargé à la demande, hors chiffre) | 150 Ko | 48 Ko | 156 ms | 0 |

Budgets proposés : JS accueil ≤ 180 Ko, étude ≤ 250 Ko, polices ≤ 150 Ko — respectés en laboratoire.
**Ce ne sont pas des Core Web Vitals de terrain** : à mesurer au 75e percentile après mise en ligne.
INP non mesuré (nécessite des interactions réelles).

## Non testé

Appareils réels Android/iOS (installation PWA, clavier logiciel), Safari/Firefox, lecteurs d'écran,
appels réels aux fournisseurs IA et à l'oEmbed YouTube, gros PDF (374 pages) réels, charge concurrente,
audit de sécurité externe, mode `SITE_AUDIENCE=public`.
