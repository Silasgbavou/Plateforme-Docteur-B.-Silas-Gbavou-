# MUSIQUE ORIGINALE ET SOUND DESIGN — plan et cue sheet

**Ce qui est livré** : une composition instrumentale originale et tous les effets sonores, entièrement synthétisés par le script `tools/audio/compose.py` (synthèse additive, enveloppes, réverbération à convolution calculée). Aucun échantillon, aucune boucle, aucune œuvre existante imitée. Le script est la partition : le relancer redonne exactement les mêmes fichiers.

**Limite à connaître** : il s’agit d’instruments synthétiques (piano feutré, nappes, ensemble de cordes, basse, percussions douces), pas d’un enregistrement d’orchestre. Je ne peux pas écouter le résultat : le contrôle a été fait par la mesure (niveaux, crêtes, spectre, calage). Une écoute humaine reste nécessaire avant diffusion.

## Fichiers (48 kHz, 24 bits, stéréo) dans `out/audio/`

| Fichier | Contenu | Niveau mesuré |
|---|---|---|
| `MIX_ME.wav` | Musique + effets, sans voix (bande du film livré) | −13,8 LUFS, crête −1,5 dBFS |
| `MIX_ME_DUCKE.wav` | Même mixage, pré-atténué de 8 dB sous les 18 fenêtres de voix | −18,2 LUFS, crête −1,7 dBFS |
| `STEM_MUSIQUE.wav` | Musique seule | −13,8 LUFS |
| `STEM_SFX.wav` | Effets seuls | −26,6 LUFS (12,8 LU sous la musique) |
| `cues.json` | Temps des mesures, repères d’effets, fenêtres de voix | — |

Le stem voix (VO) n’existe pas encore : il sera fourni après enregistrement.

## Forme

- Tonalité : **ré majeur** (lumière, solennité) ; couleur **si mineur** pour les séquences de nuit (04 et 06) ; cadence finale résolutive sur ré.
- Mesure 4/4, 37 mesures. Tempo adaptatif **80 à 90 BPM** : chaque séquence contient un nombre entier de mesures, de sorte que les transitions tombent exactement sur 0, 8, 19, 31, 45, 61, 76, 88 et 105 s.
- Thème (piano, 4 mesures) : fa♯–la–ré’ | mi’–do♯’–la | ré’–fa♯’–mi’–ré’ | si–la. Tierce puis quarte ascendantes : simple, mémorisable, discret.

| Séq. | Temps | Mesures | Tempo | Harmonie (une mesure par barre) | Instrumentation et geste |
|---|---|---|---|---|---|
| 01 | 0–8 s | 1–3 | 90 | Ré sus2 \| Si m7 \| Sol maj7 – La sus4 | Nappe seule en fondu, air lumineux, souffle montant vers 8 s |
| 02 | 8–19 s | 4–7 | 87,3 | Ré \| La/Do♯ \| Si m7 \| Sol – La sus4 | Impact grave doux, **exposition du thème** au piano, cordes tenues, basse |
| 03 | 19–31 s | 8–11 | 80 | Sol add9 \| Ré/Fa♯ \| Mi m7 \| La sus4 – La | Arpèges calmes en croches, réponse du thème à l’octave |
| 04 | 31–45 s | 12–16 | 85,7 | Si m9 \| Sol maj7 \| Ré/Fa♯ \| Mi m9 \| La sus4 | Pulsations légères, notes hautes espacées, nappe sombre |
| 05 | 45–61 s | 17–22 | 90 | Ré \| Si m7 \| Sol \| La \| Fa♯ m7 – Si m7 \| Sol – La | **Reprise du thème**, ostinato de cordes, tics soyeux en croches, tambour grave sur les premiers temps |
| 06 | 61–76 s | 23–27 | 80 | Si m7 \| Sol maj7 \| Mi m7 \| Ré/Fa♯ \| La sus4 – La | Ligne de cordes ascendante, arpèges cristallins, grande montée vers l’aube |
| 07 | 76–88 s | 28–31 | 80 | Ré \| Sol/Ré \| Si m7 \| La | **Thème aux cordes**, piano discret |
| 08 | 88–105 s | 32–37 | 90 puis ralenti | Sol \| La \| Si m7 – La/Do♯ \| Sol – La sus4 \| Ré add9 \| Ré | Énoncé final, résolution, accord arpégé, queue de réverbération |

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
