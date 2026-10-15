-- Couverture réelle téléversée par l'administrateur (WebP dérivé). Absente => reliure typographique.
ALTER TABLE works ADD COLUMN cover_key TEXT;
ALTER TABLE works ADD COLUMN cover_width INTEGER;
ALTER TABLE works ADD COLUMN cover_height INTEGER;
