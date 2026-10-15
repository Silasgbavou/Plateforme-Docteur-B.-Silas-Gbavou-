import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/admin";
import { listArticles, saveArticle } from "@/lib/server/articles";
import { PILLARS, PILLAR_IDS } from "@/lib/domain/pillars";
import { Flash, flashUrl } from "@/components/ui/Flash";
import { audit } from "@/lib/server/audit";

async function save(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  let target: string;
  try {
    const title = String(formData.get("title") ?? "").trim().slice(0, 200);
    const body = String(formData.get("body") ?? "").trim();
    const pillar = String(formData.get("pillar"));
    const status = formData.get("status") === "publie" ? "publie" : "brouillon";
    if (!title || body.length < 20) throw new Error("Titre et texte (20 caractères minimum) requis.");
    if (body.length > 200_000) throw new Error("Texte trop long.");
    if (!PILLAR_IDS.includes(pillar as (typeof PILLAR_IDS)[number])) throw new Error("Pilier requis.");
    const id = String(formData.get("id") ?? "") || undefined;
    const r = saveArticle({ id, title, pillar, theme: String(formData.get("theme") ?? "").trim().slice(0, 80) || null, body, status });
    audit(who, "ecrit.enregistrement", r.id, { status });
    target = flashUrl("/gestion/ecrits", "ok", status === "publie" ? "Écrit publié." : "Brouillon enregistré.");
  } catch (e) {
    target = flashUrl("/gestion/ecrits", "erreur", e instanceof Error ? e.message : "Erreur.");
  }
  redirect(target);
}

function ArticleForm({ a }: { a?: { id: string; title: string; pillar: string; theme: string | null; body: string; status: string } }) {
  const p = a?.id ?? "new";
  return (
    <form action={save} className="form">
      {a ? <input type="hidden" name="id" value={a.id} /> : null}
      <div className="form__row">
        <div className="field"><label htmlFor={`t-${p}`}>Titre</label><input id={`t-${p}`} name="title" defaultValue={a?.title} required maxLength={200} /></div>
        <div className="field">
          <label htmlFor={`p-${p}`}>Pilier</label>
          <select id={`p-${p}`} name="pillar" defaultValue={a?.pillar ?? ""} required>
            <option value="" disabled>Choisir…</option>
            {PILLARS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor={`th-${p}`}>Thème</label><input id={`th-${p}`} name="theme" defaultValue={a?.theme ?? ""} maxLength={80} /></div>
      </div>
      <div className="field"><label htmlFor={`b-${p}`}>Texte (paragraphes séparés par une ligne vide)</label><textarea id={`b-${p}`} name="body" rows={10} defaultValue={a?.body} required /></div>
      <div className="actions">
        <button type="submit" name="status" value="brouillon" className="btn btn--line btn--small">Enregistrer en brouillon</button>
        <button type="submit" name="status" value="publie" className="btn btn--solid btn--small">Publier</button>
      </div>
    </form>
  );
}

export default async function EcritsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const articles = listArticles(false);
  return (
    <>
      <h1 className="admin__title">Écrits et notes</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <section className="admin__panel"><h2>Nouvel écrit</h2><ArticleForm /></section>
      {articles.map((a) => (
        <details key={a.id} className="admin__panel">
          <summary>{a.title} <span className="subtle">— {a.status}</span></summary>
          <ArticleForm a={a} />
        </details>
      ))}
    </>
  );
}
