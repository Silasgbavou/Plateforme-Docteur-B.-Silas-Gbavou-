# Direction artistique — « la maison d'édition et le lutrin »

Concept : une maison d'édition théologique doublée d'un lieu d'étude. La sophistication vient des proportions,
des filets et de la typographie, non des effets.

- **Palette** (tokens `styles/tokens.css`) : bleu nuit `#0B2545`, or `#D4AF37` réservé aux filets et détails
  (2,0:1 sur albâtre : jamais pour du texte clair ; or lisible `#8A6D12` à 4,66:1), albâtre `#FAF9F6`,
  crème d'étude `#FAF8F5`, texte `#1E293B`, céleste et ambre pour les voiles. Contrastes calculés.
- **Typographie** auto-hébergée (latin uniquement, 5 fichiers, ≤ 72 Ko) : Cormorant Garamond 400 + vrai
  italique pour les titres (`-0.022em`, interligne 1,12, ligatures/kerning, `font-synthesis: none`) ;
  Plus Jakarta Sans 400/500/600 pour le texte (1,0625 rem / 1,72). Échelle fluide `--step--1` → `--step-5`.
- **Motifs propres** : l'arche doctorale (portrait officiel quand il sera fourni, sinon voile soyeux et
  monogramme — jamais de visage généré) ; trois cartouches numérotés `01.` `02.` `03.` en chiffres elzéviriens
  sur fond albâtre, filet or, sans bloc bleu plein ; reliures typographiques à tranche et ombres multicouches,
  inclinaison légère réservée aux pointeurs fins et désactivée en mouvement réduit.
- **Composition** : grille asymétrique à l'ouverture (5/7), rythme de sections varié (`--section` fluide),
  conteneurs lecture/standard/large, pas d'enchaînement hero–cartes–statistiques–témoignages.
- **Boutons** : action principale en bleu nuit ; actions secondaires blanches à filet fin et liseré or,
  flèche vectorielle ; pas de pavés pleins répétés.
- **Mouvement** : 180–360 ms, propriétés ciblées (jamais `transition: all`), `prefers-reduced-motion` respecté.
- **Étude** : surface crème, question en Cormorant avec filet or, sources numérotées `S1…` cliquables,
  saisie ancrée en bas (`dvh`, zones sûres, clavier logiciel via `interactive-widget=resizes-content`).
