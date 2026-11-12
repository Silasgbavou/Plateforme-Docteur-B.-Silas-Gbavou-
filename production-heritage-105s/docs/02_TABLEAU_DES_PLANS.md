# TABLEAU DES PLANS — 105 s, 3150 images, 30 i/s, 1920 × 1080

Base : `04_STORYBOARD/PLAN_PAR_PLAN.csv` et `STORYBOARD_DIRECTEUR.md`. **Les huit timecodes du dossier sont conservés sans modification.**
Repère 3D : Y vers le haut, sol à y = 0, 1 unité = 10 cm, caméra regardant vers −Z. Focales en millimètres pour un capteur de 36 mm.
Courbes : `io3` = cubique entrée-sortie, `io5` = quintique, `o5` = sortie quintique, `i3` = entrée cubique, `back` = dépassement de 4 %, `antic` = anticipation de 6 %, ressort = réponse amortie (amortissement 0,78 à 0,82).
Flou de mouvement : 2 ou 3 sous-images sur un obturateur de 180°, **uniquement** pendant les déplacements ; 1 seule image nette pendant toutes les plages de lecture.
Le code de chaque plan est indiqué pour retrouver les images clés exactes.

## Vue d’ensemble

| Plan | In | Out | Durée | Images | Séquence | Ambiance | Mesures musicales |
|---|---|---|---|---|---|---|---|
| 01 | 00:00 | 00:08 | 8 s | 0–239 | Prologue lumineux | jour, hall de lumière | 1–3 (90 BPM) |
| 02 | 00:08 | 00:19 | 11 s | 240–569 | Révélation couverture | jour | 4–7 (87 BPM) |
| 03 | 00:19 | 00:31 | 12 s | 570–929 | Ouverture physique | jour | 8–11 (80 BPM) |
| 04 | 00:31 | 00:45 | 14 s | 930–1349 | Lecture pédagogique | nuit bleue | 12–16 (86 BPM) |
| 05 | 00:45 | 01:01 | 16 s | 1350–1829 | Architecture doctrinale | nuit bleue | 17–22 (90 BPM) |
| 06 | 01:01 | 01:16 | 15 s | 1830–2279 | Immersion dans les pages | nuit puis aube | 23–27 (80 BPM) |
| 07 | 01:16 | 01:28 | 12 s | 2280–2639 | Présentation des auteurs | jour | 28–31 (80 BPM) |
| 08 | 01:28 | 01:45 | 17 s | 2640–3149 | Signature et contacts | jour | 32–37 (90 BPM puis ralenti) |

---

## Plan 01 — 00:00 → 00:08 · Prologue lumineux  (`film/js/film_a.js`, `stage.js`)

- **Intention** : entrer dans la lumière ; poser l’épigraphe du livre avant de montrer le livre.
- **Cadrage, focale** : plan d’ensemble symétrique, point de fuite central ; 30 → 40 mm.
- **Caméra** : dolly-in continu sur Z de 64 à 15 (y 3,5 → 2,6), visée (0 ; 2,6 → 1,85 ; 0) ; courbe `io2` étalée sur 8,6 s pour que la décélération se termine dans le plan 02 (raccord de vitesse).
- **Couches** : dôme dégradé bleu-blanc ; onze portiques lumineux (cadres arrondis 11 × 8,4, tous les 7,5 unités) et leurs reflets ; six rubans bleus translucides ; six filets d’or convergents ; sol brillant ; halo de fond ; livre au loin ; habillage 2D.
- **Matériaux, lumière** : émissifs blancs et bleutés avec bloom léger ; filets or `#e9b44c` ; brouillard blanc 34 → 26 / 125.
- **Asset source** : aucun élément des références n’est incorporé (grammaire de 314201). Verset : PDF p. 16, 19, 452.
- **Images clés** : filets d’or tracés de 0,3 à 5,6 s (`io3`) ; verset en montée masquée mot à mot à 1,0 s (décalage 70 ms, 0,8 s par mot) ; filet orange 2,4 s ; référence 2,7 s ; sortie 6,5 → 7,2 s.
- **Lecture stable** : verset entier lisible de 2,6 à 6,5 s (3,9 s).
- **Transition** : entrée par fondu d’ouverture musical ; sortie en continuité spatiale (même décor, même mouvement).
- **Musique** : nappe Ré sus2 → Si m7 → Sol maj7 / La sus4, crescendo ; souffle montant vers 8,0 s.
- **Voix** : VO01 (00:00,8 → 00:08,2). **SFX** : air lumineux 0–8 s, souffle 7,2 s.
- **Recette** : verset identique au PDF ; aucun élément ajouté de type croix ou colombe ; livre visible mais non lisible avant 6 s.

## Plan 02 — 00:08 → 00:19 · Révélation de la couverture  (`film_a.js`, `book.js`)

- **Intention** : révéler l’objet et son identité ; titre et auteurs.
- **Cadrage, focale** : plan moyen du livre debout, puis livre au tiers gauche et bloc titre à droite ; 40 → 50 mm.
- **Caméra** : fin du dolly (z 15,2 → 9,7 à 11,8 s, `o3`) ; travelling latéral droit (x 0,25 → 1,95, 11,8 → 14,3 s, `io3`) ; orbite lente jusqu’à 19,1 s (`io2`).
- **Livre** : lacet −25° (8,0 s) → +12,3° (13,3 s, `back`) → +8,6° (19,1 s). Reflet au sol par clone miroir.
- **Couches** : livre 3D (1er plat = PDF p. 1), reflet, ombre portée, hall, balayage lumineux unique, panneau de verre 2D, bloc identité.
- **Matériaux, lumière** : couverture pelliculée (rugosité 0,34, réflexions d’environnement) ; lumière clé chaude haute gauche, contre-jour bleuté, hémisphère ; balayage spéculaire 12,1 → 13,7 s.
- **Asset source** : PDF p. 1 (300 dpi), p. 452 pour les libellés.
- **Bloc identité (14,0 → 18,7 s)** : « ENSEIGNEMENT · DOCTRINE · INITIATION PROPHÉTIQUE » ; titre en deux lignes (montée masquée, décalage 80 ms) ; filet ; « Un ouvrage spirituel, doctrinal et d’initiation prophétique, développé en quinze chapitres. » ; les deux noms (décalage 160 ms).
- **Lecture stable** : 16,4 → 18,2 s.
- **Transition** : continuité (in) ; continuité de mouvement vers le plan 03 (out).
- **Musique** : exposition du thème au piano, Ré | La/Do♯ | Si m7 | Sol – La sus4 ; impact doux à 8,0 s.
- **Voix** : VO02 (00:09,2 → 00:17,4). **SFX** : impact grave et tintement 8,0 s, souffle du balayage 12,1 s.
- **Recette** : titre de couverture intact et non déformé ; noms exacts ; filets d’or atténués derrière le texte.

## Plan 03 — 00:19 → 00:31 · Ouverture physique  (`film_a.js`, `book.js`)

- **Intention** : montrer un vrai livre, son épaisseur, ses premières pages dans l’ordre.
- **Cadrage, focale** : plongée trois-quarts sur le livre couché ; 45 → 47 mm.
- **Caméra** : grue montante 19,1 → 21,6 s (`io3`) vers (0,6 ; 7,3 ; 5,5) ; orbite de 18° environ jusqu’à 29,6 s ; rapprochement sur l’avant-propos 26,6 → 28,4 s ; plongée finale dans la marge de la page 19 de 29,6 à 31,0 s (`i3`).
- **Livre** : bascule debout → couché 19,1 → 21,0 s (pivot sur la tranche de pied) ; couverture ouverte 21,2 → 23,0 s (`antic`, charnière sur le dos, le plat retombe sur la table) ; feuille p. 2/3 à 23,75 s (1,05 s) ; feuilletage de six feuilles p. 4/5 à p. 14/15 à partir de 25,0 s (décalage 140 ms, 0,86 s chacune) ; feuilles p. 16/17 et p. 18/19 à 28,3 et 28,56 s.
- **Feuilles** : rubans de 28 segments, courbure calculée (la base mène, la pointe retarde), ombres portées sur les pages.
- **Asset source** : PDF p. 2 à 20, dans l’ordre.
- **Étiquettes de page** : « PAGE 2 · Page de titre » (22,2 → 23,9) ; « PAGES 3 – 4 · Mentions · Sommaire » (24,6 → 25,4) ; « PAGES 15 – 16 · Index · Avant-propos » (26,5 → 28,5) ; « PAGES 19 – 20 · Partie 1 · Chapitre 1 » (29,2 → 30,5).
- **Lecture stable** : double page 15|16 de 26,5 à 28,3 s.
- **Transition out** : push Z dans le blanc du papier, raccord sur blanc à 31,0 s.
- **Musique** : arpèges calmes, Sol add9 | Ré/Fa♯ | Mi m7 | La sus4 – La.
- **Voix** : VO03a, VO03b. **SFX** : glissement 19,2 s, pose 20,95 s, ouverture 21,2 s, neuf bruissements de page synchronisés.
- **Recette** : ordre des pages du PDF respecté ; pas de flou sur la double page tenue ; aucune page inventée.

## Plan 04 — 00:31 → 00:45 · Lecture pédagogique  (`film_b.js`)

- **Intention** : enseigner par la page réelle ; arrêter le regard sur une figure, un passage, un tableau.
- **Cadrage, focale** : vue d’ensemble de trois panneaux, puis trois gros plans frontaux ; 40 mm (ensemble), 50 mm (lecture).
- **Caméra** : recul depuis la page 35 (31,0 → 32,75 s, `io3`) ; trois déplacements `io5` vers les panneaux (arrivées 34,2 / 38,2 / 42,0 s) ; pendant chaque lecture, avancée lente de 10,0 à 9,6 unités (zoom progressif de 4 %) ; sortie 44,15 → 45,6 s.
- **Couches** : dôme nuit et étoiles ; trois panneaux de verre (dalle translucide, liseré lumineux, en-tête, fenêtre de lecture masquée) ; cadres dorés de surlignage ; légendes 2D.
- **Fenêtre de lecture** : la page défile derrière un masque ; vitesse variable (`io3`).
  - Panneau A : p. 29 → p. 30, défilement 33,0 → 34,6 s, arrêt sur la **figure 1** ; lecture 34,6 → 36,9 s.
  - Panneau B : p. 35, défilement 37,3 → 38,4 s, arrêt sur la **section 5 et l’encadré Colossiens 1:12** ; lecture 38,4 → 40,7 s.
  - Panneau C : p. 68, défilement 41,0 → 42,0 s, arrêt sur le **tableau 1** ; lecture 42,0 → 44,15 s.
- **Surlignage** : cadre doré extérieur à la page, tracé 0,55 s après l’arrêt (`o5`), retiré 0,35 s avant le départ. La page n’est jamais modifiée.
- **Asset source** : PDF p. 29, 30, 35, 68 à 300 dpi.
- **Transition** : in = raccord sur blanc puis recul ; out = panneaux écartés (gauche, haut, droite), push Z.
- **Musique** : Si m9 | Sol maj7 | Ré/Fa♯ | Mi m9 | La sus4, pulsations légères, notes de piano espacées.
- **Voix** : VO04a, VO04b. **SFX** : souffles de déplacement, molette discrète, tintement à chaque surlignage (34,65 / 38,45 / 42,05 s).
- **Recette** : texte du corps lisible (environ 25 px de haut à l’écran) ; trois plages nettes de 2,2 à 2,3 s ; légendes placées sous la fenêtre, sans couvrir le texte.

## Plan 05 — 00:45 → 01:01 · Architecture doctrinale  (`film_b.js`)

- **Intention** : donner la carte de l’ouvrage : quatre parties, quinze chapitres.
- **Cadrage, focale** : grille 2 × 2 frontale, puis une carte en vedette à la fois ; 40 mm.
- **Caméra** : glissement en Z vers la grille (45,6 → 47,6 s) ; quatre approches `io5` de 0,9 s, puis avancée lente pendant la lecture ; à 60,0 s traversée de la grille vers le carrousel.
- **Couches** : titre « Quatre parties. Quinze chapitres. » (45,4 → 47,0 s) ; quatre cartes numérotées (équerre bleue, grand chiffre en filet, titre, chapitres, épigraphe, page) ; ombres ; carrousel visible au loin.
- **Images clés** : apparition des cartes à 46,7 s, **décalage 120 ms**, ressort depuis z −16 ; vedettes : partie 1 de 47,9 à 50,6 s, partie 2 de 50,6 à 53,6 s, partie 3 de 53,6 à 56,9 s, partie 4 de 56,9 à 59,9 s (durées proportionnelles aux titres dits) ; carte en vedette avancée de 0,85 unité, les autres assombries ; dispersion 59,95 → 61,0 s.
- **Asset source** : PDF p. 19, 100, 168, 281 et sommaire p. 4-13 (19 titres contrôlés automatiquement).
- **Transition** : in = push Z ; out = traversée entre les cartes.
- **Musique** : reprise du thème, ostinato de cordes, tics soyeux en croches, Ré | Si m7 | Sol | La | Fa♯ m7 – Si m7 | Sol – La.
- **Voix** : VO05a à VO05e. **SFX** : quatre tics d’apparition, souffle et tintement à chaque vedette.
- **Recette** : titres exacts ; chaque carte lisible au moins 1,4 s en vedette ; pas de chevauchement du titre et des cartes.

## Plan 06 — 01:01 → 01:16 · Immersion dans les pages  (`film_b.js`)

- **Intention** : faire sentir la richesse des pages : schémas, illustrations, figures.
- **Cadrage, focale** : carrousel de dix pages, page en vedette au tiers gauche, légende à droite ; 45 → 50 mm.
- **Caméra** : arrivée 60,0 → 62,7 s ; trois arrêts à 9,7 unités de la page avec avancée lente ; reculs intermédiaires ; recul final 73,3 → 76,0 s.
- **Carrousel** : rayon 7,2, dix pages dans l’ordre croissant (33, 141, 142, 184, 221, 282, 287, 302, 351, 417) ; rotations `o5`, `io5`, `io3` ; envol final `i3`.
- **Arrêts nets** : **figure 6, p. 142** de 64,0 à 66,2 s ; **illustration 11, p. 287** de 67,9 à 70,1 s ; **figure 12, p. 302** de 71,1 à 73,3 s (trois gels de 2,2 s).
- **Couches** : pages réelles lumineuses, dalles de verre, dos bleutés, cadres dorés, cartes de légende.
- **Asset source** : PDF, pages citées.
- **Transition out** : l’aube monte à l’horizon (73,5 → 75,9 s) et envahit l’image ; raccord sur lumière à 76,0 s. Sens : de la nuit à « la lumière ».
- **Musique** : Si m7 | Sol maj7 | Mi m7 | Ré/Fa♯ | La sus4 – La, ligne de cordes ascendante, montée vers 76,0 s.
- **Voix** : VO06a, VO06b. **SFX** : traversée, deux rotations, trois tintements, grande montée de souffle.
- **Recette** : légendes conformes aux libellés du PDF ; pages voisines assombries ; aucune page figurant le Christ.

## Plan 07 — 01:16 → 01:28 · Présentation des auteurs  (`film_c.js`)

- **Intention** : présenter les deux auteurs à égalité.
- **Cadrage, focale** : deux portraits côte à côte, symétriques ; 45 mm.
- **Caméra** : travelling latéral lent de x −0,55 à +0,55 et avancée de 56,2 à 54,9 (`io2`) : parallaxe entre portraits, plaques de nom et portiques.
- **Couches** : hall de lumière ; deux portraits montés (liseré or, ombre) ; deux plaques de nom en verre dépoli placées 0,42 unité en avant ; mention « LES AUTEURS ».
- **Images clés** : portrait du Docteur B. Silas Gbavou à 76,45 s, portrait du Pasteur M. Appolos Gbavou à 78,0 s (ressorts, depuis les côtés) ; plaques 0,5 s après chaque portrait.
- **Asset source** : `269163.jpg` et `254419.jpg`, **recadrage seul**, aucune retouche, aucun détourage ; attribution vérifiée sur PDF p. 452 ; notices p. 452.
- **Lecture stable** : 79,5 → 86,5 s.
- **Transition** : in = raccord sur lumière ; out = les portraits deviennent les vignettes des cartes de contact (élément partagé).
- **Musique** : thème aux cordes, Ré | Sol/Ré | Si m7 | La.
- **Voix** : VO07a, VO07b. **SFX** : deux entrées feutrées, deux tintements.
- **Recette** : visages nets, non déformés, non recolorés ; même taille, même hauteur, même durée d’exposition pour les deux.

## Plan 08 — 01:28 → 01:45 · Signature et contacts  (`film_c.js`)

- **Intention** : signer et inviter à contacter les auteurs.
- **Cadrage, focale** : livres à gauche (1re et 4e de couverture), deux cartes de contact à droite ; 45 mm ; zone de sécurité de 10 % respectée pour les contacts.
- **Caméra** : stabilisation 86,6 → 88,8 s ; micro-avancée jusqu’à 99,0 s ; **immobilité relative de 99,0 à 105,0 s** (dérive de 0,07 unité).
- **Couches** : hall ; livre principal (PDF p. 1) et second exemplaire retourné (PDF p. 452, dos titré) avec reflets ; deux cartes (fond, vignette-portrait, nom, trois lignes icône + libellé) ; pastille de mise en avant ; bloc titre.
- **Images clés** : cartes 87,2 → 88,6 s ; livres en ressort à 87,7 et 88,05 s ; huit lignes à partir de 88,75 s (**décalage 120 ms**, micro-rebond de l’icône) ; mises en avant Facebook 94,2 s, WhatsApp 95,5 s, e-mail 96,8 s.
- **Contacts affichés** (PDF p. 3 et 452) : Docteur B. Silas Gbavou — Facebook « Docteur B. Silas Gbavou », WhatsApp +229 01 67 96 00 94, silasgbavou@gmail.com ; Pasteur M. Appolos Gbavou — Facebook « Pasteur M. Appolos Gbavou », WhatsApp +229 01 96 79 96 70, appolosgbavou@gmail.com. Aucune URL.
- **Lecture stable** : écran complet de 97,8 à 105,0 s (7,2 s), dont 6,0 s d’immobilité relative.
- **Transition** : in = élément partagé ; out = dernière image tenue, sans fondu au noir.
- **Musique** : énoncé final, Sol | La | Si m7 – La/Do♯ | Sol – La sus4 | Ré (ralenti) | Ré tenu ; résolution et queue de réverbération.
- **Voix** : VO08a, VO08b, VO08c. **SFX** : poses des livres, huit tics de lignes, trois touches de mise en avant.
- **Recette** : chiffres contrôlés un à un ; icône à gauche, libellé à droite, grille alignée ; lecture finale supérieure à 4 s.
