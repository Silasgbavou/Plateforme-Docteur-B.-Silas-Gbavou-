-- Écrits, audios et sélection quotidienne authentifiée.

CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('prophetique','spirituel','doctrinal')),
  theme TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('brouillon','publie')),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE audios (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('prophetique','spirituel','doctrinal')),
  theme TEXT,
  storage_key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  transcript TEXT,
  status TEXT NOT NULL CHECK (status IN ('brouillon','publie')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  published_at TEXT
);

-- Verset / citation du jour : uniquement sélection saisie par l'administrateur, avec référence.
CREATE TABLE daily_selections (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('verset','citation')),
  text TEXT NOT NULL,
  reference TEXT NOT NULL,
  edition_id TEXT REFERENCES editions(id),
  page_number INTEGER,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (day, kind)
);
