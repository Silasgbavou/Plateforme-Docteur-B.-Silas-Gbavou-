import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { newId } from "@/lib/server/ids";
import { listPublishedWorks } from "@/lib/server/catalog";
import { Flash, flashUrl } from "@/components/ui/Flash";
import { audit } from "@/lib/server/audit";

async function save(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  let target: string;
  try {
    const day = String(formData.get("day"));
    const kind = formData.get("kind") === "citation" ? "citation" : "verset";
    const text = String(formData.get("text") ?? "").trim();
    const reference = String(formData.get("reference") ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Date invalide.");
    if (text.length < 5 || !reference) throw new Error("Texte et référence (édition, page ou livre biblique) requis.");
    const workId = String(formData.get("workId") ?? "");
    const page = Number(formData.get("page") ?? 0) || null;
    const edition = workId ? (db().prepare("SELECT id FROM editions WHERE work_id = ? AND status = 'publiee'").get(workId) as { id: string } | undefined) : undefined;
    db().prepare(
      `INSERT INTO daily_selections (id, day, kind, text, reference, edition_id, page_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(day, kind) DO UPDATE SET text = excluded.text, reference = excluded.reference, edition_id = excluded.edition_id, page_number = excluded.page_number, created_by = excluded.created_by`,
    ).run(newId(), day, kind, text.slice(0, 2000), reference.slice(0, 200), edition?.id ?? null, page, who);
    audit(who, "quotidien.enregistrement", `${day}:${kind}`);
    target = flashUrl("/gestion/quotidien", "ok", "Sélection enregistrée.");
  } catch (e) {
    target = flashUrl("/gestion/quotidien", "erreur", e instanceof Error ? e.message : "Erreur.");
  }
  redirect(target);
}

export default async function DailyAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const works = listPublishedWorks();
  const rows = db().prepare("SELECT day, kind, text, reference FROM daily_selections ORDER BY day DESC LIMIT 60").all() as { day: string; kind: string; text: string; reference: string }[];
  return (
    <>
      <h1 className="admin__title">Verset et citation du jour</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <p className="subtle">
        Rien n&apos;est généré : seule la sélection saisie ici, avec sa référence vérifiée, apparaît sur l&apos;accueil. Sans sélection
        pour le jour, la rubrique reste masquée.
      </p>
      <form action={save} className="form admin__panel">
        <div className="form__row">
          <div className="field"><label htmlFor="day">Date</label><input id="day" name="day" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div className="field">
            <label htmlFor="kind">Type</label>
            <select id="kind" name="kind"><option value="verset">Verset</option><option value="citation">Citation d&apos;un ouvrage</option></select>
          </div>
        </div>
        <div className="field"><label htmlFor="text">Texte exact</label><textarea id="text" name="text" rows={3} required maxLength={2000} /></div>
        <div className="form__row">
          <div className="field"><label htmlFor="reference">Référence (ex. livre biblique et édition, ou ouvrage et page)</label><input id="reference" name="reference" required maxLength={200} /></div>
          <div className="field">
            <label htmlFor="workId">Ouvrage source (facultatif)</label>
            <select id="workId" name="workId" defaultValue=""><option value="">—</option>{works.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="page">Page du fichier</label><input id="page" name="page" type="number" min={1} /></div>
        </div>
        <button type="submit" className="btn btn--solid btn--small">Enregistrer</button>
      </form>
      <ul className="plain-list">
        {rows.map((r) => <li key={`${r.day}-${r.kind}`}><strong>{r.day}</strong> · {r.kind} · « {r.text.slice(0, 120)} » — {r.reference}</li>)}
      </ul>
    </>
  );
}
