import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/admin";
import { deleteObservatoryEntry, listObservatory, observatoryStats } from "@/lib/server/observatory";
import { decodeCursor, encodeCursor } from "@/lib/server/messages";
import { getPillar } from "@/lib/domain/pillars";
import { Flash, flashUrl } from "@/components/ui/Flash";
import { audit } from "@/lib/server/audit";

const PAGE = 25;

async function remove(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  const id = String(formData.get("id"));
  deleteObservatoryEntry(id);
  audit(who, "observatoire.suppression", id);
  redirect(flashUrl("/gestion/observatoire", "ok", "Échange supprimé."));
}

type SP = Promise<{ du?: string; au?: string; q?: string; statut?: string; apres?: string; ok?: string; erreur?: string }>;

export default async function ObservatoryPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const date = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  const filters = { from: date(sp.du), to: date(sp.au), q: sp.q?.slice(0, 100) || undefined, statut: sp.statut || undefined };
  const rows = listObservatory({ ...filters, cursor: decodeCursor(sp.apres ?? null) }, PAGE + 1);
  const page = rows.slice(0, PAGE);
  const stats = observatoryStats();
  const last = page[page.length - 1];
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...Object.fromEntries(Object.entries({ du: filters.from, au: filters.to, q: filters.q, statut: filters.statut }).filter(([, v]) => v) as [string, string][]), ...extra }).toString();

  return (
    <>
      <h1 className="admin__title">Observatoire Doctrinal des Fidèles</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <p className="subtle">
        Échanges du moteur d&apos;étude, pseudonymisés par identifiant de navigateur (le texte libre peut néanmoins identifier une
        personne). Ces données servent à vérifier la fidélité pédagogique ; elles ne mesurent pas l&apos;état spirituel de quiconque.
        Dates en UTC.
      </p>

      <section className="admin__panel stats-grid">
        <div>
          <h2>Par semaine</h2>
          <ul className="plain-list">{stats.weeks.map((w) => <li key={w.period}>{w.period} : {w.n}</li>)}</ul>
        </div>
        <div>
          <h2>Par mois</h2>
          <ul className="plain-list">{stats.months.map((m) => <li key={m.period}>{m.period} : {m.n}</li>)}</ul>
        </div>
        <div>
          <h2>Issues (30 jours)</h2>
          <ul className="plain-list">{stats.byStatus.map((s) => <li key={s.status}>{s.status} : {s.n}</li>)}</ul>
        </div>
        <div>
          <h2>Ouvrages cités (30 jours)</h2>
          <p className="subtle">Nombre d&apos;échanges dont les sources proviennent d&apos;ouvrages de ce pilier/thème.</p>
          <ul className="plain-list">{stats.themes.map((t) => <li key={`${t.pillar}-${t.theme}`}>{getPillar(t.pillar ?? "")?.label ?? "—"} · {t.theme} : {t.n}</li>)}</ul>
        </div>
      </section>

      <form className="form form--inline admin__panel" method="get">
        <div className="field"><label htmlFor="du">Du</label><input id="du" name="du" type="date" defaultValue={filters.from} /></div>
        <div className="field"><label htmlFor="au">Au</label><input id="au" name="au" type="date" defaultValue={filters.to} /></div>
        <div className="field"><label htmlFor="q">Mot-clé</label><input id="q" name="q" defaultValue={filters.q} maxLength={100} /></div>
        <div className="field">
          <label htmlFor="statut">Issue</label>
          <select id="statut" name="statut" defaultValue={filters.statut ?? ""}>
            <option value="">Toutes</option>
            {["reponse", "documentaire", "insuffisant", "indisponible", "erreur", "annule", "en_cours"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button type="submit" className="btn btn--line btn--small">Filtrer</button>
      </form>

      {page.length === 0 ? <p className="muted">Aucun échange pour ces critères.</p> : (
        <ol className="observatory">
          {page.map((r) => (
            <li key={r.id} className="admin__panel">
              <p className="subtle">
                <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString("fr-FR", { timeZone: "UTC" })} UTC</time> · session {r.sessionId.slice(0, 8)} · {r.context}
                {r.workId ? ` · ouvrage ${r.workId}` : ""} · {r.status}{r.durationMs != null ? ` · ${(r.durationMs / 1000).toFixed(1)} s` : ""}
                {r.provider ? ` · ${r.provider}/${r.model}` : ""}
              </p>
              <p className="exchange__question">{r.question}</p>
              {r.answer ? (
                <details>
                  <summary>Réponse intégrale et sources ({r.sources.length})</summary>
                  {r.answer.notice ? <p>{r.answer.notice}</p> : null}
                  {r.answer.sections ? Object.entries(r.answer.sections).filter(([, v]) => v).map(([k, v]) => <div key={k}><h3 className="answer__heading">{k}</h3><p className="pre">{v}</p></div>) : null}
                  {r.answer.citations?.map((c, i) => <blockquote key={i} className="citation"><p>{c.source} — « {c.extrait} »</p></blockquote>)}
                  {r.answer.limites ? <p><strong>Limites :</strong> {r.answer.limites}</p> : null}
                  <ol className="plain-list">{r.sources.map((s) => <li key={s.ref}>{s.ref} · <a href={s.href}>{s.title}</a> — {s.location}</li>)}</ol>
                </details>
              ) : null}
              <form action={remove}><input type="hidden" name="id" value={r.id} /><button type="submit" className="btn btn--ghost btn--small btn--danger">Supprimer cet échange</button></form>
            </li>
          ))}
        </ol>
      )}
      <nav className="pager" aria-label="Pagination">
        {sp.apres ? <Link href={`/gestion/observatoire?${qs({})}`}>Plus récents</Link> : null}
        {rows.length > PAGE && last ? <Link href={`/gestion/observatoire?${qs({ apres: encodeCursor(last) })}`}>Plus anciens →</Link> : null}
      </nav>
    </>
  );
}
