# MUSIQUE ORIGINALE ET SOUND DESIGN — plan et cue sheet

**Ce qui est livré** : une composition instrumentale originale et tous les effets sonores, entièrement synthétisés par le script `tools/audio/compose.py` (synthèse additive, enveloppes, réverbération à convolution calculée). Aucun échantillon, aucune boucle, aucune œuvre existante imitée. Le script est la partition : le relancer redonne exactement les mêmes fichiers.

**Limite à connaître** : il s’agit d’instruments synthétiques (batterie, basse, arpèges, piano, nappes, cordes), pas d’un enregistrement d’orchestre. Je ne peux pas écouter le résultat : le contrôle a été fait par la mesure (niveaux, crêtes, spectre, calage). Une écoute humaine reste nécessaire avant diffusion.

## Fichiers (48 kHz, 24 bits, stéréo, FLAC sans perte) dans `out/audio/`

| Fichier | Contenu | Niveau mesuré |
|---|---|---|
| `MIX_ME` | Musique + effets, sans voix (bande du film livré) | −13,8 LUFS, crête vraie −1,8 dBTP |
| `MIX_ME_DUCKE` | Même mixage, pré-atténué de 8 dB sous les 18 fenêtres de voix | environ −18 LUFS |
| `STEM_MUSIQUE` | Musique seule | environ −14 LUFS |
| `STEM_SFX` | Effets et sons d’interface seuls | environ −24 LUFS |
| `cues.json` | Temps des mesures, repères d’effets, fenêtres de voix | — |

Le stem voix (VO) n’existe pas encore : il sera fourni après enregistrement.

## Forme (version 2 : musique publicitaire moderne, rythmée)

- Tonalité **ré majeur**, couleur **si mineur** pour les séquences de nuit ; 37 mesures à 4/4 ; tempo 80 à 90 BPM calé pour que les transitions tombent exactement sur 0, 8, 19, 31, 45, 61, 76, 88 et 105 s.
- Instrumentation : **batterie** (grosse caisse, caisse claire, clap, charleston fermé et ouvert, toms, cymbale crash), **basse synthé**, **arpèges en doubles croches**, piano (thème), nappes et cordes, **montées (risers) et impacts** à chaque transition, **pompage** des nappes sur la grosse caisse.
- Thème (piano, 4 mesures) : fa♯–la–ré’ | mi’–do♯’–la | ré’–fa♯’–mi’–ré’ | si–la.

| Séq. | Temps | Mesures | Harmonie | Rythmique |
|---|---|---|---|---|
| 01 | 0–8 s | 1–3 | Ré sus2 \| Si m7 \| Sol maj7 – La sus4 | Sans batterie ; nappe, air, montée de 3,2 s vers la révélation |
| 02 | 8–19 s | 4–7 | Ré \| La/Do♯ \| Si m7 \| Sol – La sus4 | **Impact + crash à 8,0 s**, groove pop (grosse caisse syncopée, clap sur 2 et 4, charleston en croches), basse, arpèges, thème au piano, relance de toms |
| 03 | 19–31 s | 8–11 | Sol add9 \| Ré/Fa♯ \| Mi m7 \| La sus4 – La | Même pulsation allégée pour laisser entendre le papier ; relance, montée |
| 04 | 31–45 s | 12–16 | Si m9 \| Sol maj7 \| Ré/Fa♯ \| Mi m9 \| La sus4 | Mi-tempo aéré (grosse caisse + clap au 3e temps), roulement de caisse claire et montée vers 45 s |
| 05 | 45–61 s | 17–22 | Ré \| Si m7 \| Sol \| La \| Fa♯ m7 – Si m7 \| Sol – La | **Plein régime** : quatre temps marqués, charleston en doubles croches, basse en croches, thème repris, roulement et montée |
| 06 | 61–76 s | 23–27 | Si m7 \| Sol maj7 \| Mi m7 \| Ré/Fa♯ \| La sus4 – La | Demi-tempo ample (caisse claire au 3e temps), toms, **grande montée de 3,2 s** vers la lumière |
| 07 | 76–88 s | 28–31 | Ré \| Sol/Ré \| Si m7 \| La | Impact + crash, groove chaleureux, charleston ouvert, thème aux cordes |
| 08 | 88–105 s | 32–37 | Sol \| La \| Si m7 – La/Do♯ \| Sol – La sus4 \| Ré add9 \| Ré | Plein régime, relance, ralenti, **impact final** sur l’accord de ré, résonance |

## Sons d’interface (design d’interaction)

- **Molette de défilement** : crans audibles dont la cadence suit la vitesse du défilement (serrés au milieu, espacés au départ et à l’arrivée), puis butée douce à l’arrêt : 33,0–34,6 s, 37,3–38,4 s, 41,0–42,0 s.
- **Sélection** (surlignages, cartes, arrêts du carrousel) : « pop » ascendant court.
- **Boutons de contact** : clic net + pop, un par plateforme (Facebook 94,2 s, WhatsApp 95,5 s, e-mail 96,8 s), répété sur les deux cartes.
- **Étiquettes de page** et lignes de contact : clics légers.

## Cue sheet des effets (calés sur les images clés du film)

| Temps | Événement à l’image | Effet |
|---|---|---|
| 00:00,0 – 00:08,0 | couloir de lumière | air lumineux filtré |
| 00:07,2 – 00:08,0 | approche du livre | souffle montant |
| 00:08,0 | **TITLE_REVEAL** : le livre sort de la lumière | impact grave doux, tintement |
| 00:12,1 | balayage lumineux sur la couverture | souffle aigu |
| 00:19,2 / 00:20,95 | le livre se couche | glissement, pose |
| 00:21,2 / 00:22,9 | la couverture s’ouvre et se pose | souffle grave, pose |
| 00:23,75 | **PAGE_TURN** p. 2/3 | bruissement de page |
| 00:25,0 → 00:25,7 | **PAGE_TURN** × 6 (p. 4/5 à 14/15) | six bruissements (140 ms d’écart) |
| 00:28,3 / 00:28,56 | **PAGE_TURN** p. 16/17, 18/19 | deux bruissements |
| 00:30,2 → 00:31,0 | plongée dans la page | souffle, tintement |
| 00:32,75 · 00:36,9 · 00:40,7 · 00:44,3 | déplacements entre panneaux | souffles |
| 00:33,2 → 00:41,8 | défilement des pages | molette discrète |
| 00:34,65 · 00:38,45 · 00:42,05 | surlignages (figure 1, section 5, tableau 1) | tintements |
| 00:46,7 → 00:47,1 | quatre cartes (120 ms d’écart) | quatre tics |
| 00:47,9 · 00:50,6 · 00:53,6 · 00:56,9 | partie en vedette | souffle et tintement montant |
| 01:00,0 → 01:02,6 | traversée vers le carrousel | long souffle |
| 01:04,05 · 01:07,95 · 01:11,1 | arrêts (figure 6, illustration 11, figure 12) | tintements |
| 01:06,2 · 01:10,1 | rotations du carrousel | souffles |
| 01:13,4 → 01:16,0 | montée de l’aube | grande montée de souffle |
| 01:16,0 | retour dans la lumière | impact doux, scintillements |
| 01:16,45 · 01:18,0 | entrées des portraits | souffles feutrés, tintements |
| 01:26,7 → 01:28,5 | portraits vers les cartes | souffle |
| 01:28,55 · 01:28,9 | pose des deux livres | poses graves |
| 01:28,75 → 01:29,5 | huit lignes de contact (120 ms) | huit tics |
| 01:34,2 · 01:35,5 · 01:36,8 | **CTA** : Facebook, WhatsApp, e-mail | touches et tintements |
| 01:41,7 → 01:45,0 | accord final | résonance, fondu de 1,6 s |

## Si vous souhaitez une production musicale plus riche

Le brief reste valable pour un compositeur ou un outil spécialisé : même grille de 37 mesures et mêmes repères (`cues.json`), instruments réels (piano feutré, quatuor ou section de cordes, nappes, percussion cinématique légère), stems séparés musique / effets / voix, niveau −14 LUFS intégrés, crête vraie −1,5 dBTP.
