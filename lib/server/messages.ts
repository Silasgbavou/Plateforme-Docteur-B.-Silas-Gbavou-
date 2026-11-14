import "server-only";
import { db } from "./db";
import { newId, nowIso } from "./ids";
import { ApiError } from "./http";

export interface Message {
  id: string;
  senderRole: "lecteur" | "ministere";
  body: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  readerId: string;
  displayName: string;
  contact: string | null;
  unreadForAdmin: number;
  updatedAt: string;
}

const CONV = `id, reader_id AS readerId, display_name AS displayName, contact, unread_for_admin AS unreadForAdmin, updated_at AS updatedAt`;

export function conversationForReader(readerId: string): Conversation | null {
  return (db().prepare(`SELECT ${CONV} FROM conversations WHERE reader_id = ?`).get(readerId) as Conversation | undefined) ?? null;
}

export function getConversation(id: string): Conversation | null {
  return (db().prepare(`SELECT ${CONV} FROM conversations WHERE id = ?`).get(id) as Conversation | undefined) ?? null;
}

export function encodeCursor(m: { createdAt: string; id: string }) {
  return Buffer.from(`${m.createdAt}|${m.id}`).toString("base64url");
}

export function decodeCursor(c: string | null): { createdAt: string; id: string } | undefined {
  if (!c) return undefined;
  const [createdAt, id] = Buffer.from(c, "base64url").toString().split("|");
  if (!createdAt || !id || !/^\d{4}-\d{2}-\d{2}T/.test(createdAt)) throw new ApiError(400, "curseur_invalide", "Curseur invalide.");
  return { createdAt, id };
}

/** Page de messages, du plus récent au plus ancien ; retournée dans l'ordre chronologique. */
export function listMessages(conversationId: string, limit = 30, before?: { createdAt: string; id: string }) {
  const rows = (before
    ? db().prepare(`SELECT id, sender_role AS senderRole, body, created_at AS createdAt FROM messages WHERE conversation_id = ? AND (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT ?`).all(conversationId, before.createdAt, before.id, limit + 1)
    : db().prepare(`SELECT id, sender_role AS senderRole, body, created_at AS createdAt FROM messages WHERE conversation_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`).all(conversationId, limit + 1)) as Message[];
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const oldest = page[page.length - 1];
  return { messages: page.reverse(), nextCursor: hasMore && oldest ? encodeCursor(oldest) : null };
}

/** Message du lecteur : crée la conversation au premier envoi. Idempotent via clientId. */
export function postReaderMessage(readerId: string, input: { body: string; clientId: string; displayName?: string; contact?: string | null }) {
  const d = db();
  return d.transaction(() => {
    const dup = d.prepare("SELECT m.id, m.sender_role AS senderRole, m.body, m.created_at AS createdAt, c.reader_id AS readerId FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE m.client_id = ?").get(input.clientId) as (Message & { readerId: string }) | undefined;
    if (dup) {
      if (dup.readerId !== readerId) throw new ApiError(409, "conflit", "Identifiant de message déjà utilisé.");
      const { readerId: _r, ...m } = dup;
      void _r;
      return m;
    }
    let conv = conversationForReader(readerId);
    if (!conv) {
      if (!input.displayName) throw new ApiError(422, "validation", "Indiquez votre nom pour ouvrir la consultation.", false, undefined, { displayName: "Votre nom est requis." });
      const id = newId();
      d.prepare("INSERT INTO conversations (id, reader_id, display_name, contact) VALUES (?, ?, ?, ?)").run(id, readerId, input.displayName, input.contact ?? null);
      conv = getConversation(id)!;
    }
    const id = newId();
    const createdAt = nowIso();
    d.prepare("INSERT INTO messages (id, conversation_id, sender_role, body, client_id, created_at) VALUES (?, ?, 'lecteur', ?, ?, ?)").run(id, conv.id, input.body, input.clientId, createdAt);
    d.prepare("UPDATE conversations SET updated_at = ?, unread_for_admin = unread_for_admin + 1 WHERE id = ?").run(createdAt, conv.id);
    return { id, senderRole: "lecteur" as const, body: input.body, createdAt };
  })();
}

export function postMinistryReply(conversationId: string, body: string, clientId: string) {
  const d = db();
  return d.transaction(() => {
    const dup = d.prepare("SELECT id FROM messages WHERE client_id = ?").get(clientId);
    if (dup) return;
    if (!getConversation(conversationId)) throw new ApiError(404, "introuvable", "Conversation introuvable.");
    const createdAt = nowIso();
    d.prepare("INSERT INTO messages (id, conversation_id, sender_role, body, client_id, created_at) VALUES (?, ?, 'ministere', ?, ?, ?)").run(newId(), conversationId, body, clientId, createdAt);
    d.prepare("UPDATE conversations SET updated_at = ?, unread_for_admin = 0 WHERE id = ?").run(createdAt, conversationId);
  })();
}

export function listConversations(limit = 30, before?: string) {
  return (before
    ? db().prepare(`SELECT ${CONV} FROM conversations WHERE updated_at < ? ORDER BY updated_at DESC LIMIT ?`).all(before, limit)
    : db().prepare(`SELECT ${CONV} FROM conversations ORDER BY updated_at DESC LIMIT ?`).all(limit)) as Conversation[];
}
