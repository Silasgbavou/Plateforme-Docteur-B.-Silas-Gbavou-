import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Chaque fichier de test dispose d'une base en mémoire et d'un stockage temporaire isolés.
process.env.DATABASE_PATH = ":memory:";
process.env.STORAGE_DIR = mkdtempSync(path.join(tmpdir(), "ms-test-"));
process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-1234";
