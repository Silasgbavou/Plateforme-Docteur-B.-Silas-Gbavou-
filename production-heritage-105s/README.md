# L’Héritage des saints dans la lumière — film publicitaire 105 s

Production motion design 3D éditoriale, YouTube 16:9, 1920 × 1080, 30 i/s, 1 min 45 s.
Auteurs de l’ouvrage : Docteur B. Silas Gbavou et Pasteur M. Appolos Gbavou.

## Livrables

| Fichier | Contenu |
|---|---|
| `out/HERITAGE_105s_FINAL.mp4` | **Film final avec la voix off fournie**, musique v3 et bruitages (H.264 1080p30, AAC 48 kHz, −14 LUFS) |
| `out/HERITAGE_105s_SANS_VOIX.mp4` | Même film, musique et bruitages sans voix (version M&E) |
| `out/audio/*.flac` | Mixage final, M&E, stems voix / musique / musique duckée / bruitages (48 kHz, 24 bits) ; `placement_voix.json` |
| `out/controle/` | Planches-contact et images de contrôle du rendu final |
| `docs/01_AUDIT_PDF_ET_CONFORMITE.md` | Audit du PDF avec preuves paginées, pages retenues, conformité |
| `docs/02_TABLEAU_DES_PLANS.md` + `PLAN_PAR_PLAN_REALISE.csv` | Les huit plans : timecodes, caméra, focales, couches, images clés, transitions, audio, recette |
| `docs/VOIX_OFF_FINALE.md` + `SOUS_TITRES_FR.srt` | Texte de voix off (180 mots) avec repères, version sobre, sous-titres |
| `docs/MUSIQUE_ET_CUE_SHEET.md` | Plan musical, harmonie, cue sheet des effets |
| `docs/RAPPORT_QC.md` | Contrôle qualité mesuré, point par point |
| `docs/DROITS_ET_LICENCES.md` | Inventaire des droits |

**Ce qui n’est pas livré, et pourquoi** : un projet Blender, After Effects ou Premiere (ces logiciels ne sont pas disponibles dans cet environnement : le projet exécutable est celui décrit ci-dessous) ; un master ProRes (commande fournie plus bas) ; l’analyse des quatre liens Pinterest (accès réseau refusé).

## Le projet exécutable

Tout le film est un programme : une page web qui calcule chaque image à partir du temps, rendue image par image.

```
film/index.html         page du film (aperçu interactif)
film/js/core.js         easings, ressorts, images clés, textures, design tokens
film/js/stage.js        moteur : three.js (WebGL), lumières, hall de lumière, nuit bleue, bloom, flou de mouvement
film/js/book.js         livre relié 3D : plats, dos, charnière, bloc, feuilles courbes
film/js/film_a.js       plans 01 à 03
film/js/film_b.js       plans 04 à 06
film/js/film_c.js       plans 07 et 08 (contacts)
film/js/hud.js          habillage 2D (titres, légendes)
film/js/main.js         timeline des huit plans, seek(t), renderFrame(n)
film/assets/pages/      rendus directs des pages du PDF
film/assets/img/        portraits recadrés
tools/extract_assets.py extraction des pages et portraits depuis les sources
tools/render.mjs        rendu MP4 image par image (Chromium + ffmpeg)
tools/probe.mjs         images fixes de contrôle à des instants donnés
tools/audio/compose.py  musique originale + effets (la partition est ce script)
tools/verify_texts.py   contrôle des textes affichés contre le PDF
```

### Aperçu

```
cd film && python3 -m http.server 8000      # puis ouvrir http://localhost:8000/index.html?t=12
```
Espace : lecture / pause · ← → : image précédente / suivante (Maj : 1 s) · R : retour au début. Ajouter `&scale=0.5` pour un aperçu plus fluide.

### Refaire le film

Prérequis : Node 22 avec Playwright et son Chromium, ffmpeg, Python 3 avec `pymupdf pillow numpy scipy soundfile`.

```
# 1. (facultatif) régénérer les images depuis les sources, non versées dans le dépôt
python3 tools/extract_assets.py source/OUVRAGE_SOURCE_INTEGRAL.pdf source/02_REFERENCES_VISUELLES
python3 tools/verify_texts.py  source/OUVRAGE_SOURCE_INTEGRAL.pdf

# 2. audio : bruitages, musique v3 (FluidSynth + banque FluidR3_GM), mixage avec la voix fournie
python3 tools/audio/compose.py          # bruitages et sons d'interface (STEM_SFX)
python3 tools/audio/music_v3.py         # musique (STEM_MUSIQUE)
python3 tools/audio/mix_final.py source/VOIX_OFF.mp3

# 3. image de base (environ 1,3 s par image en rendu logiciel ; deux moitiés en parallèle)
node tools/render.mjs out/part1.mp4 --from=0    --to=1575 --crf=12 &
node tools/render.mjs out/part2.mp4 --from=1575 --to=3150 --crf=12 &
wait
printf "file 'part1.mp4'\nfile 'part2.mp4'\n" > out/list.txt
ffmpeg -f concat -safe 0 -i out/list.txt -c copy out/base.mp4

# 3 bis. passe de finition : les 18 plages en mouvement sont re-rendues avec un flou de mouvement lisse (6 sous-images)
mkdir -p out/runs
for k in 0 1 2; do node tools/render_runs.mjs out/runs $k 3 6 & done; wait
python3 tools/assemble.py out/base.mp4 out/runs out/image.mp4 17

# 4. assemblage
ffmpeg -i out/image.mp4 -i out/audio/MIX_ME.wav -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p \
       -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
       -c:a aac -b:a 256k -movflags +faststart out/HERITAGE_105s_SANS_VOIX.mp4

# master ProRes 422 HQ (lourd, environ 2 Go)
ffmpeg -i out/image.mp4 -i out/audio/MIX_ME.wav -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le -c:a pcm_s24le out/MASTER_PRORES.mov
```

Ne rendre qu’un passage après une retouche : `node tools/render.mjs out/retouche.mp4 --from=930 --to=1350`.

### Ajouter la voix

Voir `docs/VOIX_OFF_FINALE.md` : placer la voix sur ses repères, mixer avec `out/audio/MIX_ME_DUCKE.flac`, viser −14 LUFS.

## Règles respectées

- Le PDF est la source souveraine : pages affichées telles quelles, surlignages posés par-dessus, aucun texte recomposé.
- Portraits : recadrage seul. Contacts : contrôlés caractère par caractère. Aucune URL inventée.
- Aucune image de référence ou de stock dans le film ; aucune représentation ajoutée du Christ, de croix ou de colombe.
