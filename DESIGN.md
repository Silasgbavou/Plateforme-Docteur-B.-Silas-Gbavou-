# Design — Ministère d'Enseignement du Docteur B. Silas Gbavou

Direction choisie par le propriétaire (14 novembre 2026) : **le pagne de cérémonie fondu dans la structure classique du ministère**. Le site s'habille comme une étoffe commémorative : bleu nuit tissé du motif de l'arche, médaillon d'or, lisière ambrée qui porte le nom du ministère, pages d'albâtre pour la lecture.

## Fondations (imposées par le brief, prioritaires sur toute règle de kit)

| Rôle | Valeur |
| --- | --- |
| Bleu nuit (étoffe, titres) | `#0B2545` |
| Or (filets, détails, jamais de texte courant) | `#D4AF37` ; or lisible pour texte `#8A6D12` |
| Albâtre (fond de lecture) | `#FAF9F6` |
| Crème d'étude | `#FAF8F5` |
| Texte | `#1E293B` |
| Ambre de lisière | `--amber-300` |
| Titres | Cormorant Garamond (italiques vraies) |
| Texte | Plus Jakarta Sans |

Motif propre : **l'arche doctorale** (`components/wax/ArchMark.tsx`), répétée en tuile (`--wax-tile`), en glyphe de lisière (`--wax-arch-glyph`) et en forme de fenêtre (`.fabric-hero__cloth`, `.arch-window`).

## Composants du monde « pagne » (`components/wax/`)

- `Medallion` : cercles d'or concentriques ; accueille `public/portraits/hero.webp` dès que le ministère le fournit, sinon l'emblème.
- `ArchWindow` : fenêtre en arche taillée dans l'étoffe ; accueille `public/portraits/docteur.webp`, sinon l'emblème.
- `Selvedge` : lisière décorative (aria-hidden) qui répète le nom du ministère.
- `HeroTitle` : entrée par masques, mot à mot.
- `WordHighlight` : le moment tiré de la page — la phrase des qualités du Docteur s'encre au défilement.

Aucun portrait n'est généré ; aucune citation, aucun chiffre, aucun témoignage n'est inventé.

## Mise en page

- Conteneur `.container--wide.wrap` ; toutes les divisions partagent une grille de 12 colonnes, gouttière 24 px, coupure à la 7e colonne.
- Accueil : une section par écran (ouverture, ouvrages, piliers, étude, le Docteur), clôture sur l'étoffe.
- Pages intérieures : titre en Cormorant, filet d'or sous l'en-tête de page, même clôture.
- En-tête fixe et opaque (choix de lisibilité sur téléphone).

## Mouvement (Emil Kowalski / Taste)

- Courbe `cubic-bezier(0.23, 1, 0.32, 1)` ; uniquement `transform` et `opacity` (et `clip-path` pour le déroulé de l'étoffe).
- Boutons : survol −1 px (pointeur fin), appui +1 px et `scale(0.985)`.
- Couvertures et cartouches : soulèvement de 2 px au survol.
- Menu mobile : panneau qui naît du coin haut droit, 200 ms ; jamais depuis `scale(0)`.
- `prefers-reduced-motion` : aucune entrée animée, toutes les lettres déjà encrées.

## Contrôles

- Taste gate : `GATE: OPEN 37 (rounds used up)` — voir le rapport de refonte ; dérogations motivées dans `.taste-skill/waivers.json`.
- Impeccable detect : 2 signalements restants, tous deux assumés (filet gauche des citations, convention typographique ; faux positif sur les cartouches désormais à angles droits).
- Tests : 71 unitaires, 32 de bout en bout (dont axe-core), aucun débordement à 320 px.
