# Registre des exigences (13 octobre 2026)

Statuts : **T** testé automatiquement · **I** implémenté, vérifié manuellement ou partiellement · **P** partiel ·
**N** non réalisé / bloqué. Aucun statut ne signifie « vérifié en production » : rien n'est déployé.

| Exigence | Statut | Preuve / limite |
|---|---|---|
| Trois piliers aux libellés exacts ; formats transversaux | T | `pipeline.test.ts`, E2E accueil |
| Classement des 8 ouvrages préservé ; 2 titres Drive non classés | T | `pipeline.test.ts` ; contrainte SQL `publie ⇒ pilier` |
| Bibliothèque dynamique depuis les œuvres publiées, filtres, état vide | T | E2E bibliothèque |
| Couvertures réelles | P | Téléversement + WebP au bureau ; aucune couverture originale fournie → reliures typographiques |
| Éditions immuables (SHA-256, provenance Drive, pages, statut) | T | `pipeline.test.ts` (doublon, autre œuvre, remplacement) |
| Synchronisation Drive automatique | N | Import manuel/CLI avec ID Drive ; aucune intégration OAuth Drive serveur |
| OCR des PDF image | N | Pages sans texte détectées et signalées, pas d'OCR |
| Liseuse PDF.js à la demande, `?page=N`, zoom, clavier, filigrane exact, alternative texte | T | E2E liseuse |
| Lecture hors ligne volontaire d'un livre, effacement | I | Bouton « Garder hors ligne » (Cache Storage, contrôle d'espace) ; non testé sur appareil |
| Formulaire « Recevoir cet ouvrage » : champs, validation client/serveur, email facultatif, sans case bloquante, information de consentement | T | E2E + `authz.test.ts` |
| Enregistrement avant téléchargement, idempotent, reprise après coupure | T | E2E double clic + rechargement ; 403 pour un autre lecteur |
| `/etude` pleine page intégrée, titre exact, deux contextes, ouvrage conservé | T | E2E étude |
| Prompt système métier exact | T | `generation.test.ts` vérifie l'envoi |
| Citations vérifiées, versets non sourcés retirés, relances soutenues | T | `validate.test.ts`, `generation.test.ts`, E2E (citation inventée écartée) |
| Hors corpus → limite + orientation consultation/WhatsApp/email | T | E2E + `pipeline.test.ts` |
| États réels (documentaire, génération, quota, corpus vide) | T | Badge alimenté par `/api/etude/etat` |
| SSE status/sources/answer/error/done, annulation | T/I | Flux testé E2E ; annulation testée unitairement (fallback), bouton « Arrêter » non testé E2E |
| Historique durable, isolé, supprimable | T | E2E + `authz.test.ts` |
| Fallback borné, Retry-After, clé invalide, modèle retiré, quota journalier | T | `fallback.test.ts` |
| Modèles réellement disponibles | N | Non vérifiable sans clé : `pnpm models:check` fourni |
| Budget global d'appels, priorité aux questions | T | `generation.test.ts` |
| File durable (bail, reprise après « mort » du worker, backoff, dead-letter, sans doublon) | T | `jobs.test.ts` ; exécution par processus indépendant du navigateur |
| Embeddings versionnés, espaces isolés | I | Code et schéma ; non exécuté contre un fournisseur réel |
| YouTube : URL seule, anti-SSRF, titre oEmbed | T/I | `transcripts.test.ts` (URLs hostiles) ; oEmbed non testé en réseau |
| Sous-titres automatiques | N | L'API officielle exige l'OAuth du propriétaire ; secours SRT/VTT/texte affiché immédiatement |
| Transcriptions : pas de minute inventée, brut conservé, nettoyage contrôlé, badge de début seulement sur repère source | T | `transcripts.test.ts` ; règle appliquée dans `setTeachingStart` |
| Écrits brouillon/publié, indexés à la publication | I | Bureau + pages publiques ; non couvert par E2E |
| Audios .opus : signature, original conservé, lecteur | P | Pas de conversion pour Safari ; transcription manuelle |
| Verset/citation du jour uniquement sélectionnés | I | Masqué sans sélection |
| Consultation privée isolée, pagination, états envoi/échec, réponse admin | T | E2E + `authz.test.ts` |
| Bureau : téléchargements paginés + CSV, messages, catalogue, vidéos, tâches, Observatoire (filtres, réponse intégrale, statistiques explicables, suppression) | T/I | E2E (publication, téléchargements, messages, Observatoire) ; autres écrans vérifiés au build |
| Auth admin portable, renforcée (scrypt, limitation, audit) | T | E2E refus ; `authz.test.ts` |
| PWA : manifest, icônes 192/512/maskable, SW versionné, hors ligne, pas de données privées en cache, MAJ sans rechargement forcé | T | E2E PWA (Chromium) ; non testé sur Android/iOS réels |
| Accessibilité WCAG 2.2 AA | P | axe sans violation grave sur 8 pages, clavier/menu testés ; pas d'audit manuel lecteur d'écran |
| Responsive 320→1920 px | T | E2E 9 largeurs × 6 pages |
| Performance (budgets) | P | Mesures laboratoire locales (voir rapport) ; pas de terrain |
| SEO public/privé, JSON-LD Book factuel | I | noindex vérifié E2E ; mode public non testé |
| Sécurité (CSRF, IDOR, CSP, validation, secrets) | T/P | Tests négatifs ; pas d'audit externe |
| Sauvegarde/restauration | T | Testée localement (cas sain + altération détectée) |
| Footer, contacts, logos, white-label | T | E2E accueil |
| Portraits officiels dans l'arche | N | Fichiers non fournis : arche sans visage de substitution |
| Reprise des données D1/R2 de production | N | Aucun export disponible (voir EXPLOITATION) |
