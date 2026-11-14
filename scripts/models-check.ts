/**
 * Vérifie, au moment de l'exécution, les modèles réellement accessibles avec les clés configurées,
 * et signale ceux de GEMINI_MODELS / OPENAI_MODELS qui n'existent pas pour ce compte.
 * N'affiche jamais les clés.
 */
const gKey = process.env.GEMINI_API_KEY;
const oKey = process.env.OPENAI_API_KEY;
const wanted = (v?: string) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

if (gKey) {
  const names: string[] = [];
  let page = "";
  do {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200${page ? `&pageToken=${page}` : ""}`, { headers: { "x-goog-api-key": gKey } });
    if (!res.ok) {
      console.error(`Gemini : HTTP ${res.status} (clé invalide ou API non activée ?)`);
      break;
    }
    const data = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[]; nextPageToken?: string };
    for (const m of data.models ?? []) names.push(`${m.name.replace(/^models\//, "")} [${(m.supportedGenerationMethods ?? []).join(",")}]`);
    page = data.nextPageToken ?? "";
  } while (page);
  console.log("Modèles Gemini accessibles :\n  " + names.join("\n  "));
  for (const m of [...wanted(process.env.GEMINI_MODELS), ...(process.env.EMBEDDING_PROVIDER === "gemini" ? wanted(process.env.EMBEDDING_MODEL) : [])]) {
    console.log(`${names.some((n) => n.startsWith(m + " ")) ? "OK      " : "ABSENT  "} ${m}`);
  }
}
if (oKey) {
  const res = await fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${oKey}` } });
  if (!res.ok) console.error(`OpenAI : HTTP ${res.status}`);
  else {
    const ids = ((await res.json()) as { data: { id: string }[] }).data.map((m) => m.id);
    for (const m of wanted(process.env.OPENAI_MODELS)) console.log(`${ids.includes(m) ? "OK      " : "ABSENT  "} ${m}`);
  }
}
if (!gKey && !oKey) console.log("Aucune clé configurée : le moteur fonctionnera en mode documentaire seul.");

export {};
