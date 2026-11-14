import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/server/admin";
import { decodeCursor, getConversation, listMessages, postMinistryReply } from "@/lib/server/messages";
import { audit } from "@/lib/server/audit";

async function reply(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  const id = String(formData.get("conversationId"));
  const body = String(formData.get("body") ?? "").trim();
  const clientId = String(formData.get("clientId"));
  if (!body || body.length > 4000) redirect(`/gestion/messages/${id}?erreur=1`);
  postMinistryReply(id, body, clientId);
  audit(who, "message.reponse", id);
  redirect(`/gestion/messages/${id}`);
}

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ avant?: string; erreur?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const conv = getConversation(id);
  if (!conv) notFound();
  const { messages, nextCursor } = listMessages(id, 50, decodeCursor(sp.avant ?? null));
  return (
    <>
      <p><Link href="/gestion/messages">← Conversations</Link></p>
      <h1 className="admin__title">{conv.displayName}</h1>
      {conv.contact ? <p className="subtle">Contact indiqué : {conv.contact}</p> : null}
      {nextCursor ? <Link href={`/gestion/messages/${id}?avant=${nextCursor}`}>Messages plus anciens</Link> : null}
      <ol className="chat__list">
        {messages.map((m) => (
          <li key={m.id} className={`chat__msg chat__msg--${m.senderRole === "ministere" ? "lecteur" : "ministere"}`}>
            <p className="chat__meta">{m.senderRole === "ministere" ? "Ministère" : conv.displayName} · {new Date(m.createdAt).toLocaleString("fr-FR")}</p>
            <p className="chat__body">{m.body}</p>
          </li>
        ))}
      </ol>
      <form action={reply} className="form">
        <input type="hidden" name="conversationId" value={id} />
        <input type="hidden" name="clientId" value={randomUUID()} />
        <div className="field">
          <label htmlFor="body">Réponse du ministère</label>
          <textarea id="body" name="body" rows={4} maxLength={4000} required />
        </div>
        {sp.erreur ? <p className="notice notice--error">Réponse vide ou trop longue.</p> : null}
        <button type="submit" className="btn btn--solid">Envoyer la réponse</button>
      </form>
    </>
  );
}
