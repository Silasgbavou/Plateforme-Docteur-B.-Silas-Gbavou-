# MUSIQUE (version 3) ET SOUND DESIGN

## Ce qui est livré

Une musique instrumentale de publicité éditoriale, écrite note par note (`tools/audio/music_v3.py`) et jouée par des **instruments échantillonnés réels** (banque FluidR3 GM, licence MIT, rendu FluidSynth), puis mixée et masterisée par le même script.
Elle remplace la version synthétique précédente.

La génération par ElevenLabs Music a été tentée : elle a échoué faute de crédits (« Insufficient funds »), et rien n’a été débité.

**Limite** : je ne peux pas écouter le résultat. Il est vérifié par la mesure (niveaux, spectre, calage), pas à l’oreille. Une banque General MIDI reste en dessous d’une production en studio ou d’un générateur musical spécialisé.

## Écriture

- **Ré majeur, ~90 BPM**, accords étendus : Dmaj9, Bm9, Gmaj9, A13sus4, Em9, F♯m7, Dmaj9/F♯, A/C♯, accord final D6/9.
- **Instruments** : piano à queue (accompagnement syncopé, thème en ouverture et en conclusion), piano électrique Rhodes (passages calmes), basse électrique aux doigts, batterie complète (grosse caisse avec couche sub moderne, caisse claire et clap, charleston, tambourin, shaker, toms, cymbales), nappes chaudes, cordes lentes, cloches sur l’accord final.
- **Production** : compression parallèle de la batterie, sidechain des nappes et de la basse sur la grosse caisse, réverbération de salle, élargissement stéréo, montées, cymbales inversées et impacts sur les transitions.

| Séquence | Temps | Rôle musical |
|---|---|---|
| 01 | 0–8 s | Piano en arpèges et nappes, sans batterie ; montée vers la révélation |
| 02 | 8–19 s | Impact et cymbale à 8,0 s, entrée du groove (batterie, basse, piano syncopé) |
| 03 | 19–31 s | Groove + shaker, relance de caisse claire |
| 04 | 31–45 s | Demi-tempo, Rhodes, rimshot, roulement et montée vers 45 s |
| 05 | 45–61 s | Plein régime (charleston en doubles croches, charleston ouvert, tambourin), cordes |
| 06 | 61–76 s | Respiration (Rhodes, piano) puis reprise progressive, montée vers la lumière |
| 07 | 76–88 s | Impact, groove complet, cordes |
| 08 | 88–105 s | Final, thème au piano après la voix, accord D6/9 à 101,33 s, résonance jusqu’à 105 s |

## Fichiers (`out/audio/`, 48 kHz, 24 bits, FLAC sans perte)

| Fichier | Contenu |
|---|---|
| `MIX_FINAL_VOIX.flac` | Mixage final : voix + musique + bruitages (bande de `HERITAGE_105s_FINAL.mp4`), −14 LUFS |
| `MIX_ME.flac` | Musique + bruitages sans voix (version M&E), −14 LUFS |
| `STEM_VOIX.flac` | Voix traitée et posée |
| `STEM_MUSIQUE.flac` / `STEM_MUSIQUE_DUCKEE.flac` | Musique pleine / musique avec ducking |
| `STEM_SFX.flac` | Bruitages et sons d’interface |
| `music_v3/*.mid` | Partition MIDI par instrument (modifiable dans tout logiciel de musique) |

## Sons d’interface

Crans de molette pendant les défilements (33–34,6 s, 37,3–38,4 s, 41–42 s), « pop » de sélection sur les surlignages et les arrêts du carrousel, clics sur les cartes en vedette (47,6 et 53,4 s), clic et pop sur les boutons de contact, calés sur les mots « Facebook » (93,75 s), « WhatsApp » (94,35 s) et « e-mail » (96,0 s).
