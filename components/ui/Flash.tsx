/** Message de retour après une action serveur (paramètres ?ok= / ?erreur=, texte encodé côté serveur). */
export function Flash({ ok, erreur }: { ok?: string; erreur?: string }) {
  if (!ok && !erreur) return null;
  return (
    <p className={`notice${erreur ? " notice--error" : " notice--ok"}`} role={erreur ? "alert" : "status"}>
      {erreur ?? ok}
    </p>
  );
}

export function flashUrl(path: string, kind: "ok" | "erreur", message: string) {
  const u = new URLSearchParams({ [kind]: message.slice(0, 300) });
  return `${path}${path.includes("?") ? "&" : "?"}${u}`;
}
