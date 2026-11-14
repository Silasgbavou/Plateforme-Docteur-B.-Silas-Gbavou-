# Plateforme du Ministère d'Enseignement du Docteur B. Silas Gbavou

Lieu central des livres, enseignements (prophétiques, spirituels, doctrinaux), prédications, écrits, audios,
du **Moteur d'Étude & Concordance Doctrinale du Dr B. Silas** et de la consultation privée.
Application installable (PWA) depuis les navigateurs compatibles.

> État : code prêt et testé localement (unitaires, intégration, E2E Chromium). **Rien n'est déployé.**
> Voir [docs/RAPPORT-TESTS.md](docs/RAPPORT-TESTS.md) et les décisions à confirmer dans
> [docs/DECISIONS-A-CONFIRMER.md](docs/DECISIONS-A-CONFIRMER.md).

## Mettre le site en ligne (sans compétence technique)

1. Sur la pull request, cliquer sur **Merge pull request** (le code part sur `main`).
2. Ouvrir https://render.com/deploy?repo=https://github.com/Silasgbavou/Plateforme-Docteur-B.-Silas-Gbavou-
   et se connecter avec GitHub.
3. Remplir deux champs : `ADMIN_EMAIL` (votre email) et `ADMIN_PASSWORD` (un mot de passe d'au moins
   12 caractères), puis valider. Render demande un moyen de paiement (offre « Starter » + disque de 5 Go).
4. Après quelques minutes, l'adresse du site s'affiche (`https://….onrender.com`). Le bureau est sur
   `/gestion` ; y téléverser les PDF des livres (Catalogue & éditions) puis les publier.

L'intelligence artificielle du moteur d'étude s'active plus tard en ajoutant `GEMINI_API_KEY` et
`GEMINI_MODELS` dans l'onglet Environment de Render (nouvelle clé uniquement).

## Démarrage local

```bash
pnpm install
cp .env.example .env.local            # puis compléter SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH
pnpm admin:hash                       # génère ADMIN_PASSWORD_HASH (saisie masquée hors historique)
pnpm db:migrate                       # crée la base SQLite et le catalogue initial
pnpm edition:import ruach-naba ~/Livres/ruach-naba.pdf --label "Édition numérique" --drive 1aw2qPD8zIyNTM-GkjRYUrSB11FtOj7hc
pnpm worker --once                    # extraction serveur des pages (ou `pnpm worker` en continu)
pnpm dev                              # http://localhost:3000 — publier l'édition depuis /gestion/catalogue
```

Les PDF des ouvrages, la base et les fichiers téléversés **ne sont jamais commités** (dépôt public) :
ils vivent dans `DATABASE_PATH` et `STORAGE_DIR`, hors de `/public`.

## Commandes

| Commande | Rôle |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Développement, build, serveur de production |
| `pnpm worker` | File de tâches durable (extraction, embeddings) — processus à superviser |
| `pnpm check` | Types + lint + tests unitaires/intégration |
| `pnpm test:e2e` | 32 scénarios Playwright (serveur de production + faux fournisseur IA) |
| `pnpm models:check` | Liste les modèles réellement accessibles avec les clés configurées |
| `pnpm backup` / `pnpm restore:check <dossier>` | Sauvegarde cohérente + vérification de restauration |
| `pnpm edition:import <œuvre> <pdf>` | Import d'une édition brouillon (SHA-256) |
| `pnpm drive:sync` | Synchronise le dossier Drive autorisé (brouillons uniquement) |

## Documentation

- [Architecture et décisions](docs/ARCHITECTURE.md)
- [Exploitation : variables, déploiement, worker, sauvegardes, retour arrière](docs/EXPLOITATION.md)
- [Registre des exigences et statuts](docs/REGISTRE-EXIGENCES.md)
- [Rapport de tests et mesures](docs/RAPPORT-TESTS.md)
- [Direction artistique et système de design](docs/DIRECTION-ARTISTIQUE.md)
- [Décisions à confirmer par le propriétaire](docs/DECISIONS-A-CONFIRMER.md)
