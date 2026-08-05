# Plateforme du Docteur B. Silas Gbavou

Plateforme officielle du ministère : hub central des enseignements **prophétiques, spirituels et
doctrinaux** — écrits, audios, vidéos et livres — avec une **IA pédagogique RAG** fondée
exclusivement sur le corpus du Docteur.

> Docteur de la Parole et de la Saine Doctrine · Homme Prophétique · Formateur au Prophétique ·
> Dispensateur des Mystères de DIEU et des Réalités Spirituelles du Sacerdoce en CHRIST

---

## Sommaire

1. [Ce que fait la plateforme](#1-ce-que-fait-la-plateforme)
2. [Architecture technique](#2-architecture-technique)
3. [Démarrage rapide](#3-démarrage-rapide)
4. [Variables d'environnement](#4-variables-denvironnement)
5. [La règle des 3 piliers](#5-la-règle-des-3-piliers)
6. [L'IA pédagogique (RAG)](#6-lia-pédagogique-rag)
7. [Protection des livres PDF](#7-protection-des-livres-pdf)
8. [Espace d'administration](#8-espace-dadministration)
9. [Mise en production](#9-mise-en-production)
10. [Évolution en application mobile](#10-évolution-en-application-mobile)
11. [Référence des routes](#11-référence-des-routes)

---

## 1. Ce que fait la plateforme

| Exigence du cahier des charges | Réalisation |
| --- | --- |
| **Arborescence en 3 piliers** | Tout contenu est rattaché en base à un `Pillar` (Prophétique / Spirituel / Doctrinal) et à une `SubRubric` imbriquée. Contrainte structurelle, pas seulement d'affichage. |
| **IA omniprésente** | Le composant `AiAssistant` est posé sur l'accueil, chaque pilier, chaque sous-rubrique, chaque vidéo, audio, livre et article — avec un périmètre de recherche restreint au contexte de la page. |
| **IA strictement fondée sur le corpus** | RAG : seuls les extraits récupérés dans la base sont fournis au modèle, et le prompt système interdit explicitement tout apport extérieur. Hors corpus, l'assistant le dit. |
| **Livres PDF + anti-piratage** | Fichiers stockés hors racine web, liseuse protégée, et **exemplaire nominatif filigrané** généré à chaque téléchargement (page de licence, filigrane par page, registre traçable). |
| **Vidéos YouTube + auto-catégorisation** | Import via l'API YouTube Data v3, récupération de la transcription automatique, analyse IA qui déduit la thématique et range la vidéo dans la bonne sous-rubrique du bon pilier. |
| **Questions sur une vidéo précise** | Chaque page vidéo embarque un assistant dont la recherche est limitée à la transcription de cette vidéo. |
| **Enseignements écrits** | Base structurée avec éditeur Markdown allégé, classement IA ou manuel. |
| **Audios WhatsApp (.opus)** | Module de transfert acceptant le format natif sans conversion, avec diffusion en streaming (requêtes Range). |
| **Verset & citation du jour** | Programmation à date fixe ou pool de rotation déterministe. |
| **Bureau de consultation** | Messagerie privée interne, cloisonnée par utilisateur, avec vue administrateur. |
| **Biographie** | Page de présentation du ministère et de sa vision. |
| **Contacts rapides** | Bouton flottant sur toutes les pages : WhatsApp `+229 01 67 96 00 94`, appel direct, e-mail `Silasgbavou@gmail.com`. |

---

## 2. Architecture technique

```
Next.js 15 (App Router, React 19, TypeScript)
├── Rendu serveur par défaut, composants client uniquement où c'est nécessaire
├── Tailwind CSS 3 — charte « nuit profonde / or sacerdotal / ivoire »
├── Prisma + SQLite (dev) → PostgreSQL (production)
├── Authentification maison : JWT signé (jose) en cookie httpOnly, mots de passe bcrypt
├── IA : @anthropic-ai/sdk — Claude (claude-opus-5) en streaming, pensée adaptative
├── Embeddings : Voyage AI, avec moteur local déterministe en repli
└── PDF : pdf-lib — filigranage et licence nominative à la volée
```

**Choix structurants**

- **Recherche hybride** (65 % sémantique / 35 % lexical BM25) : la pertinence reste correcte même
  sans clé d'embeddings externe, ce qui permet de démarrer le corpus sans dépendance payante.
- **Fichiers hors `public/`** : les livres et audios transitent par des routes API qui vérifient la
  session et journalisent l'accès.
- **Le middleware n'est pas la frontière de sécurité** : il ne vérifie que la présence du cookie
  (contrainte du runtime Edge). La vérification cryptographique et le contrôle de rôle sont refaits
  côté serveur dans chaque page et chaque route API.

---

## 3. Démarrage rapide

```bash
# 1. Dépendances
npm install

# 2. Configuration
cp .env.example .env
# → renseigner AUTH_SECRET (obligatoire) et ANTHROPIC_API_KEY (pour l'IA)
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Base de données + arborescence + compte administrateur + contenus de démonstration
npm run setup

# 4. Indexation du corpus pour l'assistant
npm run rag:reindex

# 5. Lancement
npm run dev        # http://localhost:3000
```

**Connexion administrateur** : l'adresse `ADMIN_EMAIL` et le mot de passe `ADMIN_PASSWORD` définis
dans `.env` (à changer impérativement avant toute mise en ligne).

### Scripts disponibles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm run start` | Build et serveur de production |
| `npm run setup` | Génération Prisma + création du schéma + amorçage |
| `npm run db:seed` | Amorçage seul (idempotent) |
| `npm run db:studio` | Explorateur de base Prisma |
| `npm run rag:reindex` | Réindexation complète du corpus |
| `npm run typecheck` | Vérification TypeScript |

---

## 4. Variables d'environnement

| Variable | Obligatoire | Rôle |
| --- | :---: | --- |
| `DATABASE_URL` | ✅ | Connexion base de données |
| `AUTH_SECRET` | ✅ | Signature des sessions (48 octets aléatoires) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | URL publique (métadonnées, sitemap) |
| `ANTHROPIC_API_KEY` | ⚠️ | Assistant IA et classification automatique |
| `ANTHROPIC_MODEL` | — | Défaut : `claude-opus-5` |
| `VOYAGE_API_KEY` | — | Embeddings de production ; sinon moteur local |
| `YOUTUBE_API_KEY` | ⚠️ | Import des vidéos |
| `YOUTUBE_CHANNEL_ID` | — | Import de toute la chaîne en un clic |
| `TRANSCRIPTION_ENDPOINT` | — | Transcription audio automatique |
| `STORAGE_DIR` | — | Répertoire privé des fichiers (défaut `./storage`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | ✅ | Compte administrateur créé au seed |

⚠️ = la plateforme fonctionne sans, mais la fonctionnalité concernée est désactivée. Le tableau de
bord affiche en permanence l'état de chaque service.

---

## 5. La règle des 3 piliers

L'arborescence est définie une seule fois, dans **`src/lib/taxonomy.ts`** — source de vérité du seed
comme du classificateur IA.

```
L'Enseignement Prophétique      L'Enseignement Spirituel      L'Enseignement Doctrinal
├── La voix de DIEU             ├── La prière                 ├── Les fondements de la foi
├── Visions et songes           ├── Le jeûne                  ├── La personne de CHRIST
├── Discernement des esprits    ├── La sainteté               ├── Le salut et la grâce
├── Formation au prophétique    ├── Le combat spirituel       ├── L'Église et les ministères
├── Intercession prophétique    ├── Le sacerdoce en CHRIST    ├── Les temps de la fin
└── Les temps et les saisons    ├── La vie de l'Esprit        ├── Les mystères de DIEU
                                └── Louange et adoration      └── L'étude des Écritures
```

**Pour ajouter une sous-rubrique** : l'ajouter dans `taxonomy.ts`, puis relancer `npm run db:seed`
(idempotent). Les mots-clés déclarés guident la classification automatique.

---

## 6. L'IA pédagogique (RAG)

### Chaîne de traitement

```
Question ─▶ Recherche hybride dans les fragments du corpus (périmètre selon la page)
         ─▶ Construction du bloc <corpus> avec les 8 meilleurs extraits
         ─▶ Claude, sous prompt système contraignant, en streaming
         ─▶ Réponse + sources citées, journalisées en base
```

### La contrainte « exclusivement mon contenu »

Elle est tenue par **deux verrous simultanés** :

1. **Structurel** — le modèle ne reçoit que les extraits récupérés dans la base. Rien d'autre ne lui
   est transmis.
2. **Instructionnel** — le prompt système (`RAG_SYSTEM_PROMPT` dans `src/lib/rag.ts`) interdit
   explicitement tout apport extérieur, impose de déclarer les questions hors corpus, interdit
   d'inventer une référence, et redirige toute demande personnelle vers le Bureau de consultation.

### Périmètres de recherche

| Page | Périmètre |
| --- | --- |
| Accueil, `/assistant` | Tout le corpus |
| Page pilier | Ce pilier uniquement |
| Page sous-rubrique | Cette thématique uniquement |
| Page vidéo / audio / article / livre | Ce contenu uniquement |

### Indexation

Le découpage (`src/lib/chunk.ts`) respecte les frontières naturelles — titres, paragraphes, phrases —
puis regroupe jusqu'à ~1 100 caractères avec 150 caractères de recouvrement. Ce recouvrement est
important pour les transcriptions parlées, peu ponctuées.

Relancer l'indexation après un import massif ou l'ajout d'une clé Voyage :
`npm run rag:reindex`, ou le bouton **Réindexer tout le corpus** du tableau de bord.

---

## 7. Protection des livres PDF

Le ministère souhaite que le téléchargement personnel reste possible. Un verrou purement technique
serait donc contournable par construction. La protection retenue est **dissuasive et opposable**
plutôt qu'illusoire.

**Quatre niveaux :**

1. **Stockage privé** — les PDF ne sont jamais dans `public/`. Ils transitent par des routes API qui
   exigent une session valide et refusent toute mise en cache.
2. **Liseuse protégée** — lecture en ligne sans barre d'outils, menu contextuel, glisser-déposer,
   impression et raccourcis de sauvegarde neutralisés. *Mesures de dissuasion, explicitement
   présentées comme telles dans le code.*
3. **Exemplaire nominatif** — chaque téléchargement produit à la volée une copie unique portant :
   - une **page de licence** au nom du titulaire (nom, e-mail, code, date) ;
   - un **filigrane diagonal** e-mail + code de licence sur chaque page ;
   - un **pied de page** « Tous droits réservés — revente interdite » ;
   - des **métadonnées PDF** verrouillées (auteur, copyright, code de licence).
4. **Registre et quotas** — chaque licence est enregistrée (code, compte, IP, navigateur), avec
   limitation horaire et quota journalier pour empêcher la constitution automatisée de stocks.

**Conséquence** : tout exemplaire retrouvé en vente est directement imputable au compte l'ayant
obtenu. C'est ce qui rend la revente impraticable — bien plus qu'un verrou technique contournable.

L'utilisateur doit accepter explicitement les conditions avant chaque téléchargement, et la page
`/droits-d-auteur` détaille l'ensemble du dispositif.

---

## 8. Espace d'administration

Accessible sur `/admin` (rôle `ADMIN` requis).

| Page | Fonctions |
| --- | --- |
| **Tableau de bord** | Métriques du corpus, état de chaque service (IA, YouTube, embeddings, transcription), réindexation |
| **Publier** | Quatre voies d'entrée : import YouTube (unitaire ou chaîne entière), transfert audio `.opus`, dépôt de livre PDF, rédaction d'un enseignement |
| **Contenus** | Publier / dépublier, corriger le classement, coller une transcription, reclasser par l'IA, réindexer, supprimer |
| **Verset & citation** | Programmation à date fixe ou ajout au pool de rotation |
| **Consultations** | Réponse aux messages privés des internautes |

**Le classement IA est toujours révisable** : le motif de chaque décision (méthode, confiance,
justification) est affiché, et un classement manuel prévaut systématiquement.

---

## 9. Mise en production

### 1. Base PostgreSQL

Dans `prisma/schema.prisma` :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

puis `npx prisma db push && npm run db:seed`. Le schéma est déjà compatible : les énumérations sont
modélisées en `String` précisément pour permettre ce basculement sans migration de types.

### 2. Stockage des fichiers

`STORAGE_DIR` doit pointer vers un **volume persistant**. Sur un hébergement au système de fichiers
éphémère (Vercel, par exemple), remplacer `src/lib/storage.ts` par un adaptateur objet (S3, R2…) :
seules les fonctions `saveBuffer` et `resolveStoredPath` sont concernées.

### 3. Limites de téléversement

Les livres et audios peuvent être volumineux. Vérifier la limite de corps de requête de
l'hébergeur et du reverse proxy (`client_max_body_size` sous Nginx). En cas de plafond bas,
privilégier un téléversement direct vers le stockage objet avec URL présignée.

### 4. Points de contrôle avant ouverture

- [ ] `AUTH_SECRET` unique et aléatoire
- [ ] `ADMIN_PASSWORD` modifié
- [ ] `NEXT_PUBLIC_SITE_URL` en HTTPS
- [ ] `STORAGE_DIR` sur volume persistant, exclu de toute sauvegarde publique
- [ ] Sauvegarde régulière de la base (registre des licences inclus)
- [ ] Icônes PWA `icone-192.png` et `icone-512.png` déposées dans `public/`

---

## 10. Évolution en application mobile

La plateforme est conçue dès l'origine pour cette bascule :

- **PWA déjà installable** — manifeste complet, thème, raccourcis, affichage `standalone`.
- **API HTTP complète et découplée** — toutes les fonctions (IA, contenus, consultation,
  authentification par cookie) passent par des routes JSON réutilisables telles quelles.
- **Deux voies possibles** :
  - **Capacitor** — empaquetage de la PWA en application iOS/Android en quelques jours ;
  - **React Native / Expo** — interface native consommant les mêmes routes API, avec
    authentification par jeton (adapter `src/lib/auth.ts` pour accepter l'en-tête `Authorization`
    en plus du cookie).

---

## 11. Référence des routes

### Pages publiques

| Route | Contenu |
| --- | --- |
| `/` | Accueil : 3 piliers, assistant IA, verset et citation du jour, publications récentes |
| `/enseignement-prophetique`, `/enseignement-spirituel`, `/enseignement-doctrinal` | Piliers |
| `/{pilier}/{sous-rubrique}` | Thématique |
| `/videos`, `/audios`, `/ecrits` | Bibliothèques filtrables |
| `/contenus/{slug}` | Enseignement (lecteur + assistant contextuel + transcription) |
| `/livres`, `/livres/{slug}` | Bibliothèque et fiche ouvrage (liseuse + téléchargement sous licence) |
| `/assistant` | Assistant IA plein écran |
| `/biographie`, `/contact` | Ministère |
| `/consultation` | Bureau de consultation (membre) |
| `/mentions-legales`, `/droits-d-auteur` | Informations légales |

### API

| Méthode | Route | Rôle |
| --- | --- | --- |
| `POST` | `/api/ia/chat` | Chat RAG en streaming (JSON Lines) |
| `POST` | `/api/auth/{inscription,connexion,deconnexion}` | Authentification |
| `GET`/`POST` | `/api/consultation`, `/api/consultation/{id}` | Messagerie privée |
| `GET` | `/api/livres/{id}/lecture` | Flux PDF protégé (session requise) |
| `POST` | `/api/livres/{id}/telechargement` | Exemplaire nominatif filigrané |
| `GET` | `/api/audios/{id}` | Diffusion audio avec requêtes Range |
| `POST` | `/api/admin/youtube` | Import + auto-catégorisation |
| `POST` | `/api/admin/audios`, `/api/admin/livres`, `/api/admin/contenus` | Publication |
| `PATCH`/`DELETE` | `/api/admin/contenus/{id}` | Édition, reclassement, réindexation |
| `GET`/`POST` | `/api/admin/index` | État et relance de l'index RAG |
| `GET`/`POST`/`DELETE` | `/api/admin/quotidien` | Versets et citations |

---

## Contact

**Docteur B. Silas Gbavou** — WhatsApp et appel : `+229 01 67 96 00 94` ·
E-mail : [Silasgbavou@gmail.com](mailto:Silasgbavou@gmail.com)

---

© 2026 Docteur B. Silas Gbavou — **Tous droits réservés**. Le code de la plateforme comme les
enseignements qu'elle héberge sont protégés ; toute reproduction, diffusion commerciale ou revente
est strictement interdite.
