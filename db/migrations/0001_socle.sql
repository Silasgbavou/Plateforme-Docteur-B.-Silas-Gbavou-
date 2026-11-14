-- Socle : catalogue canonique, éditions immuables, pages, passages, recherche.
-- Les noms historiques (download_requests, conversations, messages, rate_limits,
-- etude_conversations) sont conservés pour faciliter l'import des données D1.

CREATE TABLE works (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  pillar TEXT CHECK (pillar IN ('prophetique','spirituel','doctrinal')),
  theme TEXT,
  status TEXT NOT NULL CHECK (status IN ('publie','a_classer','retire')),
  page_count_catalog INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (status <> 'publie' OR pillar IS NOT NULL)
);

-- Provenance Drive déclarée (métadonnées). Une taille ou une date ne prouve pas l'identité binaire.
CREATE TABLE drive_sources (
  file_id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL REFERENCES works(id),
  name TEXT NOT NULL,
  size_bytes INTEGER,
  modified_time TEXT,
  revision_id TEXT,
  observed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Éditions immuables : identifiées par SHA-256 du fichier. On n'écrase jamais une édition.
CREATE TABLE editions (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL REFERENCES works(id),
  label TEXT NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  storage_key TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  page_count INTEGER NOT NULL,
  printed_page_offset INTEGER,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('drive','televersement','depot')),
  drive_file_id TEXT,
  drive_revision_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('brouillon','publiee','remplacee','retiree')),
  extraction_status TEXT NOT NULL DEFAULT 'en_attente' CHECK (extraction_status IN ('en_attente','en_cours','terminee','partielle','echec')),
  pages_without_text INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  published_at TEXT
);
CREATE INDEX editions_work ON editions(work_id, status);
-- Une seule édition publiée par œuvre.
CREATE UNIQUE INDEX editions_one_published ON editions(work_id) WHERE status = 'publiee';

CREATE TABLE edition_pages (
  edition_id TEXT NOT NULL REFERENCES editions(id),
  page_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  char_count INTEGER NOT NULL,
  PRIMARY KEY (edition_id, page_number)
);

-- Vidéos d'enseignement (YouTube intégré, jamais réhébergé).
CREATE TABLE teaching_videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  pillar TEXT CHECK (pillar IN ('prophetique','spirituel','doctrinal')),
  theme TEXT,
  status TEXT NOT NULL CHECK (status IN ('brouillon','publiee','retiree')),
  transcript_source TEXT CHECK (transcript_source IN ('captions','srt','vtt','texte_brut')),
  timed INTEGER NOT NULL DEFAULT 0,
  teaching_start_sec INTEGER,
  teaching_start_provenance TEXT,
  classification_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE video_segments (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES teaching_videos(id),
  seq INTEGER NOT NULL,
  start_sec REAL,
  end_sec REAL,
  raw_text TEXT NOT NULL,
  clean_text TEXT NOT NULL,
  UNIQUE (video_id, seq)
);

-- Passages indexés : pages d'éditions publiées ou segments vidéo.
CREATE TABLE passages (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('edition','video','article')),
  work_id TEXT,
  edition_id TEXT,
  video_id TEXT,
  article_id TEXT,
  page_start INTEGER,
  page_end INTEGER,
  start_sec REAL,
  end_sec REAL,
  pillar TEXT,
  text TEXT NOT NULL,
  text_sha256 TEXT NOT NULL,
  chunker_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX passages_edition ON passages(edition_id);
CREATE INDEX passages_video ON passages(video_id);
CREATE INDEX passages_work ON passages(work_id);

CREATE VIRTUAL TABLE passages_fts USING fts5(
  text, content='passages', content_rowid='rowid', tokenize = 'unicode61 remove_diacritics 2'
);
CREATE TRIGGER passages_ai AFTER INSERT ON passages BEGIN
  INSERT INTO passages_fts(rowid, text) VALUES (new.rowid, new.text);
END;
CREATE TRIGGER passages_ad AFTER DELETE ON passages BEGIN
  INSERT INTO passages_fts(passages_fts, rowid, text) VALUES ('delete', old.rowid, old.text);
END;

-- Embeddings versionnés : un espace = fournisseur:modèle:dimension:chunker. Jamais mélangés.
CREATE TABLE passage_embeddings (
  passage_id TEXT NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  space TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  vector BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (passage_id, space)
);
CREATE INDEX passage_embeddings_space ON passage_embeddings(space);

-- Lecteurs pseudonymes (cookie signé). Aucune donnée d'identité ici.
CREATE TABLE readers (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE download_requests (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  reader_id TEXT NOT NULL REFERENCES readers(id),
  work_id TEXT NOT NULL REFERENCES works(id),
  edition_id TEXT NOT NULL REFERENCES editions(id),
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  church TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  motivation TEXT NOT NULL,
  discovery TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX download_requests_created ON download_requests(created_at DESC, id DESC);

-- Consultation privée : une conversation par lecteur.
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  reader_id TEXT NOT NULL UNIQUE REFERENCES readers(id),
  display_name TEXT NOT NULL,
  contact TEXT,
  unread_for_admin INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX conversations_updated ON conversations(updated_at DESC);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('lecteur','ministere')),
  body TEXT NOT NULL,
  client_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX messages_conv ON messages(conversation_id, created_at DESC, id DESC);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Journal d'étude (Observatoire). Colonnes historiques conservées.
CREATE TABLE etude_conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  date_heure TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  question_utilisateur TEXT NOT NULL,
  reponse_gemini TEXT,
  sources_citees TEXT,
  temps_reponse INTEGER,
  statut TEXT NOT NULL CHECK (statut IN ('en_cours','reponse','documentaire','insuffisant','indisponible','erreur','annule')),
  fournisseur TEXT,
  modele TEXT,
  contexte TEXT NOT NULL DEFAULT 'textes',
  work_id TEXT,
  request_id TEXT NOT NULL
);
CREATE INDEX etude_session ON etude_conversations(session_id, thread_id, date_heure);
CREATE INDEX etude_date ON etude_conversations(date_heure DESC, id DESC);

-- File durable : un onglet n'est qu'un observateur.
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  dedupe_key TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('en_attente','en_cours','termine','echec','abandonne')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 6,
  run_after INTEGER NOT NULL,
  lease_owner TEXT,
  lease_until INTEGER,
  progress_done INTEGER NOT NULL DEFAULT 0,
  progress_total INTEGER,
  checkpoint TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  finished_at TEXT
);
CREATE INDEX jobs_ready ON jobs(status, run_after);

CREATE TABLE admin_audit (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
