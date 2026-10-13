import Link from "next/link";
import { requireAdmin } from "@/lib/server/admin";
import { listDownloads } from "@/lib/server/downloads";
import { decodeCursor, encodeCursor } from "@/lib/server/messages";

const PAGE = 50;

export default async function DownloadsPage({ searchParams }: { searchParams: Promise<{ apres?: string }> }) {
  await requireAdmin();
  const { apres } = await searchParams;
  const rows = listDownloads(PAGE + 1, decodeCursor(apres ?? null));
  const page = rows.slice(0, PAGE);
  const last = page[page.length - 1];
  return (
    <>
      <h1 className="admin__title">Demandes d&apos;ouvrages</h1>
      <p><a className="btn btn--line btn--small" href="/api/gestion/telechargements-csv">Exporter en CSV</a></p>
      {page.length === 0 ? <p className="muted">Aucune demande.</p> : (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Tableau des demandes">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Ouvrage / édition</th><th>Nom</th><th>Prénom</th><th>Église</th><th>WhatsApp</th><th>Email</th><th>Motivation</th><th>Découverte</th></tr>
            </thead>
            <tbody>
              {page.map((r) => (
                <tr key={r.id}>
                  <td><time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString("fr-FR")}</time></td>
                  <td>{r.title}<br /><span className="subtle">{r.editionLabel}</span></td>
                  <td>{r.lastName}</td>
                  <td>{r.firstName}</td>
                  <td>{r.church}</td>
                  <td><a href={`https://wa.me/${r.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{r.whatsapp}</a></td>
                  <td>{r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : "—"}</td>
                  <td className="table__long">{r.motivation}</td>
                  <td>{r.discovery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav className="pager" aria-label="Pagination">
        {apres ? <Link href="/gestion/telechargements">Plus récentes</Link> : null}
        {rows.length > PAGE && last ? <Link href={`/gestion/telechargements?apres=${encodeCursor(last)}`}>Plus anciennes →</Link> : null}
      </nav>
    </>
  );
}
