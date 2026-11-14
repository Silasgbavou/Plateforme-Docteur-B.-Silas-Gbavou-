import Link from "next/link";
import { requireAdmin } from "@/lib/server/admin";
import { listConversations } from "@/lib/server/messages";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ avant?: string }> }) {
  await requireAdmin();
  const { avant } = await searchParams;
  const convs = listConversations(31, avant);
  const page = convs.slice(0, 30);
  return (
    <>
      <h1 className="admin__title">Consultations privées</h1>
      {page.length === 0 ? <p className="muted">Aucune conversation.</p> : (
        <ul className="conv-list">
          {page.map((c) => (
            <li key={c.id}>
              <Link href={`/gestion/messages/${c.id}`}>
                <strong>{c.displayName}</strong> {c.unreadForAdmin ? <span className="badge badge--warn">{c.unreadForAdmin} non lu(s)</span> : null}
                <span className="subtle"> · {new Date(c.updatedAt).toLocaleString("fr-FR")}{c.contact ? ` · ${c.contact}` : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {convs.length > 30 ? <Link href={`/gestion/messages?avant=${encodeURIComponent(page[page.length - 1]!.updatedAt)}`}>Plus anciennes →</Link> : null}
    </>
  );
}
