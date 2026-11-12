# AUDIT DU PDF SOURCE ET CONFORMITÉ AU DOSSIER

Source souveraine : `OUVRAGE_SOURCE_INTEGRAL.pdf` (452 pages, A4 594,96 × 841,92 pt, PDF 1.5, balisé, 17,6 Mo).
Lecture : extraction du texte des 452 pages, vignettes des 452 pages passées en revue (8 planches-contact), signets (510 entrées), polices, images, puis lecture rapprochée des pages retenues.

## 1. Identité et structure relevées

| Élément | Relevé | Preuve (page PDF) |
|---|---|---|
| Titre | L’Héritage des saints dans la lumière | p. 1 (couverture), p. 2, p. 452 |
| Auteurs | Docteur B. Silas Gbavou ; Pasteur M. Appolos Gbavou | p. 1, 2, 3, 441-442, 452 |
| Mention | « ENSEIGNEMENT · DOCTRINE · INITIATION PROPHÉTIQUE » | p. 452 |
| Présentation | « un ouvrage spirituel, doctrinal et d’initiation prophétique, développé en quinze chapitres » | p. 452 |
| Épigraphe générale | « Rendez grâces au Père, qui vous a rendus capables d’avoir part à l’héritage des saints dans la lumière. » Colossiens 1:12 | p. 16, 19, 35, 452 |
| Droits | © Octobre 2026, les deux auteurs, tous droits réservés ; citations bibliques Louis Segond (1910) | p. 3, p. 452 |
| Sommaire | pages 4 à 13 | p. 4-13 |
| Tableaux, figures, illustrations | 16 figures, 12 tableaux, 24 illustrations | index p. 14-15 |
| Avant-propos | cosigné | p. 16-18 |
| Les auteurs de cet ouvrage | répartition des chapitres, sections et interventions | p. 441-442 |
| Lexique des définitions | annexe | p. 443-451 |
| Quatrième de couverture | texte, deux portraits, coordonnées | p. 452 |

### Les quatre parties et les quinze chapitres (titres exacts, contrôlés automatiquement contre les signets du PDF : 19/19 conformes)

| Partie | Titre | Page | Épigraphe | Chapitres (page) |
|---|---|---|---|---|
| 1 | L’héritage des saints dans la lumière | 19 | Colossiens 1:12 | 1 · L’héritage des saints et l’Évangile de la croix (20) ; 2 · Lumières d’en haut, lumières d’en bas et le nom nouveau (50) ; 3 · Le droit légal des fils dans le royaume de la lumière (77) |
| 2 | Le pouvoir des fils de la lumière | 100 | Jean 1:12 | 4 · Le pouvoir spirituel, héritage des fils de Dieu (101) ; 5 · Les suprêmes pouvoirs des fils dans l’univers de la lumière (126) ; 6 · Le discernement du royaume et les sens de l’esprit (147) |
| 3 | Le ministère des anges dans le mouvement prophétique | 168 | Hébreux 1:14 | 7 · Le ministère des anges dans le mouvement prophétique (169) ; 8 · Les chérubins, les séraphins et la crainte de Dieu (200) ; 9 · L’atmosphère prophétique et les manifestations angéliques (230) ; 10 · La hiérarchie angélique descendante et ascendante (257) |
| 4 | Le royaume prophétique et les échelles d’ascension | 281 | Amos 3:7 | 11 · La voix de Dieu, la lumière et les eaux (282) ; 12 · Le royaume prophétique, un ciel parmi les cieux (298) ; 13 · L’univers de la transfiguration prophétique (331) ; 14 · Le monde de la nuit et les sentinelles de nuit (380) ; 15 · Alliances, autels et échelles d’ascension (415) |

### Pagination

Le folio imprimé en pied de page est égal à l’index physique du PDF (ex. : page physique 30 porte le folio « 30 », page 142 le folio « 142 »). La couverture est la page 1 et n’est pas foliotée, comme les pages 2, 3 et les ouvertures de partie. **Dans tout le projet, « page N » désigne donc à la fois l’index physique et la pagination imprimée.**

### Maquette intérieure (design tokens extraits)

- Polices du PDF : **Inter** (titres, labels, tableaux) et **Lora** (texte courant, citations). Le film emploie ces deux mêmes familles (licence SIL OFL) et Cinzel uniquement pour le titre porté au dos du livre 3D.
- Couleurs prélevées : bleu nuit du ciel `#061a55`, bleu royal du bandeau `#0b2e6d`, bleu des titres `#1466c4`, bleu lumineux `#45b2fe`, encre `#16264a`, or de la porte `#e9b44c`, orange des filets `#e07b1a`, blanc papier.
- Couverture : image pleine page 2480 × 3508 px (ciel étoilé, porte dorée, escalier). Quatrième : composition vectorielle avec deux portraits.

## 2. Pages réelles retenues (sélection éditoriale finale)

Chaque image du film est le **rendu direct de la page PDF** (`tools/extract_assets.py`, PyMuPDF). Aucun texte de page n’est recomposé ni généré. Les seuls ajouts sont des cadres dorés et des légendes posés **par-dessus** (surlignage externe).

| Plan | Page(s) PDF | Contenu authentique | Usage à l’écran | Résolution |
|---|---|---|---|---|
| 02, 08 | 1 | Couverture | 1er plat du livre 3D | 300 dpi |
| 08 | 452 | Quatrième de couverture | 4e plat du second exemplaire | 300 dpi |
| 03 | 2 | Page de titre | belle page à l’ouverture | 200 dpi |
| 03 | 3 \| 4 | Mentions et coordonnées \| Sommaire | double page | 200 dpi |
| 03 | 5 à 14 | Sommaire, tableaux et figures | feuilletage (six feuilles, ordre du PDF) | 130 dpi |
| 03 | 15 \| 16 | Index des illustrations \| Avant-propos | double page tenue | 200 dpi |
| 03 | 17, 18 | Avant-propos (suite) | feuilles tournées | 130 dpi |
| 03 | 19 \| 20 | Partie 1 \| Chapitre 1 | double page finale | 200 dpi |
| 04 | 29 → 30 | 4.1 L’Évangile de la croix → **Figure 1 · Les deux dimensions du ciel ouvertes par la croix** | défilement continu, arrêt, surlignage | 300 dpi |
| 04 | 35 | **Section 5 — La capacité d’avoir part à l’héritage des saints** + encadré Colossiens 1:12 | défilement, arrêt, surlignage | 300 dpi |
| 04 | 68 | **Tableau 1 · Le désert, chemin vers l’héritage** | défilement, arrêt, surlignage | 300 dpi |
| 05 | 19, 100, 168, 281 | Ouvertures des quatre parties (titres, épigraphes) | données des quatre cartes | texte |
| 05 | 4 à 13 | Sommaire (titres des 15 chapitres) | listes des cartes | texte |
| 06 | 33 | Illustration 12 · La marche du pèlerin | carrousel | 200 dpi |
| 06 | 141 | Chapitre 5, texte | carrousel | 200 dpi |
| 06 | 142 | **Figure 6 · Pour voir, pourvoir, pouvoir** | arrêt 2,2 s, surlignage | 300 dpi |
| 06 | 184 | Figure 9 · L’ordre des esprits au service de Dieu | carrousel | 200 dpi |
| 06 | 221 | Chapitre 8, texte | carrousel | 200 dpi |
| 06 | 282 | Ouverture du chapitre 11 | carrousel | 200 dpi |
| 06 | 287 | **Illustration 11 · « Que la lumière soit ! »** | arrêt 2,2 s, surlignage | 200 dpi |
| 06 | 302 | **Figure 12 · Le royaume prophétique parmi les cieux** | arrêt 2,2 s, surlignage | 300 dpi |
| 06 | 351 | Chapitre 13, texte | carrousel | 200 dpi |
| 06 | 417 | Illustration 22 · L’échelle de Jacob à Béthel | carrousel | 200 dpi |
| 07 | 452 | Notices des deux auteurs | plaques de nom | texte |
| 08 | 3, 452 | Coordonnées des deux auteurs | cartes de contact | texte |

Écarts assumés par rapport aux aperçus du dossier (`03_PAGES_REELLES`, annoncés « non une sélection éditoriale finale ») : les pages 29, 35, 68, 141, 221, 282, 351 sont conservées ; les pages 30, 142, 287, 302, 33, 184, 417 sont ajoutées parce qu’elles portent les figures, tableaux et illustrations demandés par le storyboard (« figures et citations authentiques »).

Pages volontairement écartées par prudence : les illustrations dont le sujet est la transfiguration ou la croix (illustrations 15 et 19, p. 373 et 393), pour respecter la charte (« aucun Jésus figuré, aucune croix ni colombe ajoutée »). La figure 1 (p. 30) est un schéma de l’auteur intitulé « L’Évangile de la croix » : elle appartient au livre et n’est pas un ajout.

## 3. Conformité au prompt maître et au dossier

| Exigence | État | Commentaire |
|---|---|---|
| Lire le ZIP et le PDF | Fait | 8 documents du dossier, 19 références, 13 aperçus, 452 pages |
| 1920 × 1080, 30 fps, 105 s, 3150 images | Fait | voir `RAPPORT_QC.md` (mesures) |
| Huit séquences aux timecodes du CSV | Fait | 0, 8, 19, 31, 45, 61, 76, 88, 105 s, sans écart |
| Pages réelles, jamais recomposées | Fait | rendus PDF directs ; surlignages externes |
| Portraits authentiques non retouchés | Fait | recadrage seul ; attribution vérifiée sur p. 452 (costume bleu et gilet blanc = Docteur B. Silas Gbavou ; tenue bleue sur fond brun = Pasteur M. Appolos Gbavou) |
| Contacts exacts, aucune URL inventée | Fait | contrôle caractère par caractère contre p. 3, 441-442, 452 |
| Vrai maillage 3D du livre | Fait | plats, dos, charnière, bloc, feuilles courbes, ombres portées (three.js) |
| Blender / Cinema 4D, After Effects, Premiere | **Non disponibles ici** | remplacés par un pipeline équivalent exécutable : three.js (WebGL) + Chromium + ffmpeg. Aucun projet .blend ou .aep n’est livré |
| Références visuelles | Utilisées comme grammaire | couloir lumineux (314201), verre et panneaux (314200, 304506, 243975), quatre modules numérotés (314194), carte citation (314202), pastille bouton (314203), maquette livre (256544). **Aucune image de référence n’est incorporée** (stock, filigranes) : tous les décors sont générés par le code |
| Liens Pinterest | **Inaccessibles** | le proxy réseau de cet environnement refuse `pin.it` (erreur 403). Aucune analyse des vidéos n’a été faite ni inventée |
| Voix off | Script livré, voix non simulée | `VOIX_OFF_FINALE.md` ; le film livré est la version sans voix, déjà montée sur les fenêtres de parole |
| Musique originale | Faite | composée et synthétisée par `tools/audio/compose.py` (aucun échantillon tiers) |
| Master ProRes 422 | Non livré | encodeur disponible mais fichier trop lourd pour le dépôt ; commande fournie dans le README |

## 4. Points soumis à votre validation

1. **Dos du livre** : le PDF ne contient pas de dos. Un dos sobre a été créé (bleu de la couverture, deux filets or, titre exact en capitales). À remplacer si une maquette de dos existe.
2. **Ordre recto/verso** : la couverture étant la page 1 du PDF, la page de titre (p. 2) est placée en belle page, puis les doubles pages 3|4, 15|16, 19|20. L’ordre des pages du PDF est strictement respecté.
3. **Texte de voix off** : proposé dans `VOIX_OFF_FINALE.md`, à valider avant enregistrement.
4. **Mention « CONTACTER LES AUTEURS »** sur l’écran final : libellé neutre choisi faute d’information de diffusion dans le PDF (ni prix, ni point de vente).
