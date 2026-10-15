# Architecture

## Constat de départ (13 octobre 2026)

Le dépôt GitHub fourni ne contenait qu'un `README`. Le code audité dans le dossier de transmission
(`/workspace/sites/docteur-silas`, commit `7cd08cb`, hébergé sur ChatGPT Sites / Cloudflare Workers, D1, R2)
**n'était pas accessible** depuis cet environnement, pas plus que les exports D1/R2, les portraits, textures
et couvertures. Le produit a donc été reconstruit à partir des exigences, en reprenant les contrats documentés
(routes, noms de tables historiques, identifiants des huit ouvrages, liens `/lecture/[id]?page=N`).

## ADR-001 — Runtime : Node.js + SQLite, plutôt que Cloudflare Workers

| Critère | Cloudflare (Workers + D1 + R2, état antérieur) | Node.js + SQLite + stockage disque (retenu) |
|---|---|---|
| Code disponible | Non (dépôt audité absent) | Écrit ici, testé |
| Extraction PDF serveur (PDF.js) | Limites CPU/mémoire des Workers sur 374 pages | Processus long sans limite artificielle |
| File durable | Cloudflare Queues/Cron à ajouter | Table `jobs` + worker indépendant (bail, reprise) |
| Recherche plein texte | D1 = SQLite (FTS5 disponible) | SQLite FTS5 natif |
| Authentification | Liée à l'identité de l'hébergeur Sites | Portable : cookies signés + scrypt |
| Hébergement | Compte Cloudflare + adaptation Vinext | Tout serveur Node 22 ou conteneur (Dockerfile fourni) |

Conséquence : le schéma reste **SQLite** (compatible D1 dans ses principes) et l'accès aux données est isolé
dans `lib/server/*`. Un retour vers D1 demanderait un adaptateur asynchrone, pas une refonte métier.
**Limite** : une seule instance SQLite (un serveur). Au-delà, migrer vers PostgreSQL (mesures à l'appui).

## Organisation

```
app/                 pages (App Router, rendu serveur) et routes API
components/          composants (site, bibliothèque, liseuse, étude, consultation, UI)
lib/domain/          types et règles partagés (piliers exacts, contacts, schémas Zod)
lib/server/          services : catalogue, éditions, jobs, étude, LLM, sessions, stockage, sécurité
db/migrations/       migrations SQL additives (jamais réécrites)
scripts/             worker, migrations, import, sauvegarde, vérification des modèles, icônes
tests/unit|e2e/      Vitest (66) et Playwright (32)
```

## Flux de données

1. **Import** (bureau ou CLI) : signature `%PDF-`, SHA-256 → édition **brouillon immuable** ; tâche `edition.extract`.
2. **Worker** : extraction serveur page par page depuis les octets stockés (vérification SHA-256), découpage
   conservateur par page (`page-para-v1`), pages sans texte comptées « OCR à prévoir ». Transaction unique.
3. **Publication** (action distincte, auditée) : l'ancienne édition devient `remplacee` (pages conservées :
   les anciennes citations restent résolubles via `?edition=`), la nouvelle `publiee`.
4. **Recherche** : FTS5 (insensible aux accents) filtrée **avant** sélection (éditions publiées, œuvre choisie) ;
   recherche sémantique optionnelle dans un espace versionné `fournisseur:modèle:dimension:chunker:l2`,
   fusion RRF.
5. **Génération** : prompt système métier exact, sources encadrées comme données, sortie JSON ; validation
   des citations (extrait contigu ≥ 6 mots de la bonne source), des références `[Sx]`, des versets (retirés
   s'ils n'apparaissent pas dans les sources) et des relances ; sans citation valide → « insuffisant ».
6. **SSE** `/api/etude` : `status` → `sources` → `answer` (après validation) → `done` ; annulation réelle.
7. **Journal** `etude_conversations` (colonnes historiques conservées) → historique du lecteur + Observatoire.

## Fournisseurs IA

Aucun identifiant de modèle n'est codé en dur : `GEMINI_MODELS` / `OPENAI_MODELS` listent les modèles
autorisés, vérifiés par `pnpm models:check`. Repli : Retry-After respecté (≤ 8 s), une nouvelle tentative
par modèle, pause avec gigue avant le modèle suivant, arrêt sur clé invalide / quota journalier, 4 appels
au plus, repli inter-fournisseur seulement si `LLM_CROSS_PROVIDER_FALLBACK=true`. Budget global par minute
partagé (base) : l'indexation n'utilise que 60 % du budget.
Sans configuration : **mode documentaire** (passages seuls), annoncé comme tel.

## Sécurité

Cookies `HttpOnly` signés HMAC (lecteur : `SameSite=Lax` ; admin : `Strict`, 8 h), vérification d'origine
sur toutes les mutations API, actions serveur protégées par Next et par `requireAdmin()` dans **chaque**
page et action, SQL paramétré, FTS sans opérateurs injectables, CSP stricte (PDF.js same-origin, YouTube
nocookie), validation de signature des fichiers (PDF, images, audio), réencodage des images (EXIF retiré),
anti-SSRF YouTube (ID extrait, URL reconstruite, `redirect: "error"`), limitation de débit persistante,
erreurs expurgées (aucune clé dans les journaux), export CSV neutralisant les formules.
