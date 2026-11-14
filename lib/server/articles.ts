import "server-only";
import { db } from "./db";
import { newId, nowIso, sha256 } from "./ids";
import { chunkPage, CHUNKER_VERSION } from "./chunker";

export interface Article {
  id: string; slug: string; title: string; pillar: string; theme: string | null; body: string;
  status: "brouillon" | "publie"; publishedAt: string | null; updatedAt: string;
}
const COLS = "id, slug, title, pillar, theme, body, status, published_at AS publishedAt, updated_at AS updatedAt";

export function slugify(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "ecrit";
}

export function listArticles(publishedOnly: boolean): Article[] {
  return db().prepare(`SELECT ${COLS} FROM articles ${publishedOnly ? "WHERE status = 'publie'" : ""} ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 200`).all() as Article[];
}

export function getArticleBySlug(slug: string): Article | null {
  return (db().prepare(`SELECT ${COLS} FROM articles WHERE slug = ?`).get(slug) as Article | undefined) ?? null;
}

/** Enregistre un écrit ; s'il est publié, ses passages rejoignent le moteur d'étude (atomiquement). */
export function saveArticle(input: { id?: string; title: string; pillar: string; theme: string | null; body: string; status: "brouillon" | "publie" }) {
  const d = db();
  return d.transaction(() => {
    const id = input.id ?? newId();
    const existing = d.prepare("SELECT slug, published_at AS publishedAt FROM articles WHERE id = ?").get(id) as { slug: string; publishedAt: string | null } | undefined;
    let slug = existing?.slug ?? slugify(input.title);
    if (!existing) {
      let n = 1;
      while (d.prepare("SELECT 1 FROM articles WHERE slug = ?").get(slug)) slug = `${slugify(input.title)}-${++n}`;
      d.prepare("INSERT INTO articles (id, slug, title, pillar, theme, body, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        id, slug, input.title, input.pillar, input.theme, input.body, input.status, input.status === "publie" ? nowIso() : null,
      );
    } else {
      d.prepare("UPDATE articles SET title = ?, pillar = ?, theme = ?, body = ?, status = ?, published_at = ?, updated_at = ? WHERE id = ?").run(
        input.title, input.pillar, input.theme, input.body, input.status, input.status === "publie" ? existing.publishedAt ?? nowIso() : null, nowIso(), id,
      );
    }
    d.prepare("DELETE FROM passages WHERE article_id = ?").run(id);
    if (input.status === "publie") {
      const ins = d.prepare("INSERT INTO passages (id, source_type, article_id, pillar, text, text_sha256, chunker_version) VALUES (?, 'article', ?, ?, ?, ?, ?)");
      for (const c of chunkPage(input.body)) ins.run(newId(), id, input.pillar, c.text, sha256(c.text), CHUNKER_VERSION);
    }
    return { id, slug };
  })();
}
