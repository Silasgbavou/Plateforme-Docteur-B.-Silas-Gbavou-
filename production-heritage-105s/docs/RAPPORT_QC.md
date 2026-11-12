# RAPPORT DE CONTRÔLE QUALITÉ

Fichier contrôlé : `out/HERITAGE_105s_SANS_VOIX.mp4`. Outils : `tools/qc.py`, `tools/pops.py`, `tools/verify_texts.py`, ffprobe, ffmpeg (ebur128, blackdetect, freezedetect), revue de planches-contact et d’images en pleine résolution.

**Limite du contrôle** : je vois des images fixes et des planches, je ne visionne pas le film en mouvement et je n’entends pas le son. Le rythme réel, le ressenti des mouvements et la musique doivent être validés par un visionnage humain.

## 1. Mesures du fichier livré

```
fichier        : out/HERITAGE_105s_SANS_VOIX.mp4 (80.7 Mo)
vidéo          : h264 High 1920x1080 pix yuv420p SAR None DAR None
cadence        : 30/1 | images lues : 3150 | durée vidéo : 105.000000 s | durée conteneur : 105.000000
couleur        : tv bt709 bt709 bt709
audio          : aac 48000 Hz 2 canaux 268187 bit/s durée 105.000000
sonie          : I: -13.8 LUFS | LRA: 6.1 LU | Peak: -1.8 dBFS
silences >0,5s : aucun
images noires  : aucune
images figées  : aucune (>0,5 s)
```

SAR/DAR non inscrits dans le conteneur : pixels carrés, 1920 × 1080 = 16:9.

## 2. Recette du dossier (`08_CONTROLE_QUALITE/CHECKLIST.md`)

| Point de recette | Résultat | Preuve |
|---|---|---|
| Durée exactement 105,00 s et 3150 images à 30 i/s | **Conforme** | mesures ci-dessus |
| 16:9, 1920 × 1080, sans bandes ni déformations | **Conforme** | SAR 1:1, DAR 16:9 ; aucune image noire détectée |
| Titre, noms, crédits, couverture, pages et citations fidèles au PDF | **Conforme** | `verify_texts.py` : 0 écart ; 19/19 titres de parties et chapitres ; couverture et pages = rendus directs du PDF |
| Aucun texte fictif sur les pages, aucune photographie générée des auteurs | **Conforme** | pages non recomposées ; portraits = fichiers fournis, recadrés |
| Pages lisibles pendant les pauses pédagogiques, pas de flou sur le texte | **Conforme** | 1 seule sous-image (aucun flou) pendant toutes les plages de lecture ; corps de texte d’environ 25 px au plan 04 |
| Deux portraits et deux jeux de contacts contrôlés chiffre par chiffre | **Conforme** | contrôle automatique contre p. 3 et p. 452 + relecture visuelle de l’image finale |
| Transitions motivées, profondeur 3D cohérente, pas de clipart ni templates | **Conforme sur images fixes** | à confirmer au visionnage |
| Mix voix intelligible, musique originale, droits vérifiés | **Partiel** | pas de voix dans cette version ; musique originale synthétisée ; droits : voir `DROITS_ET_LICENCES.md`, trois confirmations demandées aux auteurs |
| Fichiers sources, polices autorisées et projets livrés | **Conforme** | projet complet dans `film/` et `tools/` ; polices OFL |
| Contrôle plan par plan, sous-titres et version sans voix | **Conforme** | tableau ci-dessous ; `SOUS_TITRES_FR.srt` ; le film livré est la version sans voix |

## 3. Contrôle plan par plan

| Plan | Contrôlé sur | Constat |
|---|---|---|
| 01 | images à 0,5 · 1,5 · 3 · 4,5 · 6 s | Verset complet et exact, lisible 3,9 s ; livre visible au bout du couloir ; filets d’or convergents |
| 02 | 8 · 10,5 · 13 · 16,5 s | Couverture nette, non déformée ; reflet au sol ; bloc identité sur panneau de verre, noms exacts |
| 03 | 20 · 22,6 · 23,2 · 24,3 · 25,7 · 27,5 s | Charnière et épaisseur crédibles ; pages dans l’ordre du PDF ; double page 15\|16 lisible ; étiquettes de page exactes |
| 04 | 31,3 · 32,7 · 35,8 · 39,5 · 43 s | Trois arrêts nets ; cadres dorés exactement sur la figure 1, la section 5 et le tableau 1 ; légendes sous la fenêtre |
| 05 | 46 · 47,7 · 49,5 · 55,5 · 58,9 s | Quatre cartes exactes ; une partie en vedette à la fois ; titre d’annonce sans chevauchement |
| 06 | 61,5 · 65 · 69 · 72,2 · 75 s | Trois gels de 2,2 s ; légendes exactes ; montée de l’aube |
| 07 | 76,4 · 77,4 · 79,5 · 81 · 84 s | Deux portraits de même taille, non retouchés ; plaques de nom lisibles ; signature du photographe hors cadre |
| 08 | 87,6 · 88,6 · 91 · 95,6 · 102 · 103 s | Contacts exacts et alignés ; icône à gauche, libellé à droite ; zone de sécurité de 10 % ; image finale tenue |

## 4. Mouvement

- `tools/pops.py` sur les 3150 images : aucun saut brusque, aucune image isolée.

```
images : 3150 | différence moyenne : 3.634 | médiane : 0.663 | max : 55.71 à l'image 2016 (67.20 s)
sauts brusques (pic > 3,5 x voisinage) : aucun
images isolées (flash d'une image) : aucune
paires d'images strictement identiques : 0
```
- Flou de mouvement : première passe à 2 ou 3 sous-images, **jugée insuffisante** (texte dédoublé pendant les déplacements rapides). Une passe de finition à 6 sous-images (obturateur 180°) a été lancée sur les 18 plages en mouvement (1002 images). **Elle a été interrompue pour livrer : 6 plages sur 18 sont finies (482 images)** : bascule du livre (19,2–21,4 s), sortie du plan 04 et entrée des cartes (44,2–48,9 s), passage de la partie 1 à la partie 2, traversée vers le carrousel (59,9–63,9 s), première rotation du carrousel (66,2–67,9 s), montée de l’aube (73,3–76 s). Les 12 autres plages gardent le flou léger de la première passe. Pour finir : `node tools/render_runs.mjs` (reprise automatique) puis `tools/assemble.py`.
- Aucun gel détecté (freezedetect) : une micro-dérive de caméra reste active pendant les lectures et sur l’écran final.

## 5. Défauts connus et réserves

1. **Voix off absente** : conforme au dossier (voix enregistrée ailleurs). Le film est monté sur les fenêtres de parole ; sans voix, certaines plages paraîtront longues.
2. **Musique synthétique** : deuxième version, publicitaire et rythmée (batterie, basse synthé, arpèges, montées et impacts), écrite après votre retour. Timbres de synthèse calculés, pas d’instruments réels ni de banque de sons. **Je ne peux pas l’écouter** : seul le niveau est mesuré. Si elle ne vous convainc pas à l’oreille, il faudra une musique produite avec un outil ou un compositeur dédié.
3. **Rendu logiciel** : pas de carte graphique dans cet environnement. Pas de profondeur de champ optique, pas de réflexions par lancer de rayons ; les reflets au sol sont des clones miroir. Le rendu est propre mais n’atteint pas un rendu Blender Cycles.
4. **Portraits** : sources de 1536 px où les personnes occupent une partie du cadre ; affichés à une taille proche de leur définition native (aucun agrandissement par IA). Pas de détourage.
5. **Dos du livre** : créé (absent du PDF), à valider.
6. **Point sombre de 3 px** en tête de gouttière au plan 03 (angle du dos visible) : négligeable à vitesse réelle.
7. **Pinterest** : références non consultées (accès refusé), donc aucune vérification de proximité avec ces montages.
8. **Master ProRes, stems séparés de la voix** : non produits (voix inexistante ; ProRes à générer avec la commande du README).

## 6. Vérifications à faire par vous avant diffusion

- Visionner le film en entier, au casque puis sur téléphone.
- Valider le texte de voix off, puis fournir la voix (ou demander sa génération).
- Confirmer les droits des images de couverture, des illustrations et des deux portraits.
- Relire l’écran final : noms, numéros, adresses.
