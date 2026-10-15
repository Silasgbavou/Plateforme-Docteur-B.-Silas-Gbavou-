-- Synchronisation Drive : empreinte MD5 fournie par Drive (indice de changement, pas preuve d'édition)
-- et date de dernière observation. La preuve d'identité reste le SHA-256 de l'édition importée.
ALTER TABLE drive_sources ADD COLUMN md5_checksum TEXT;
ALTER TABLE drive_sources ADD COLUMN last_synced_at TEXT;
ALTER TABLE drive_sources ADD COLUMN last_status TEXT;
