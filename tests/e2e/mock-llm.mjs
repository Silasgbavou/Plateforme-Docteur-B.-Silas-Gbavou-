// Faux point d'accès Gemini pour les tests E2E : répond à partir des sources reçues (aucun appel réel).
import { createServer } from "node:http";

createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (!req.url?.includes(":generateContent")) {
      res.writeHead(404).end();
      return;
    }
    const prompt = JSON.parse(body).contents[0].parts[0].text;
    const m = /<source id="S1"[^>]*>\n([\s\S]*?)\n<\/source>/.exec(prompt);
    const words = (m?.[1] ?? "").split(/\s+/).slice(0, 9).join(" ");
    const payload = {
      suffisance: "partielle",
      sections: {
        fondement: "Le passage retrouvé décrit la patience comme une attitude féconde [S1].",
        ecritures: "",
        ancrage: "Le texte cité se trouve dans la source [S1].",
        application: "Application proposée par l'assistant : persévérer avec patience.",
      },
      citations: [{ source: "S1", extrait: words }, { source: "S1", extrait: "phrase totalement inventée par le modèle pour le test" }],
      relances: [{ question: "Que dit la source sur la patience au printemps ?", sources: ["S1"] }],
      limites: "Les sources de test sont brèves.",
    };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }));
  });
}).listen(4555, "127.0.0.1", () => console.log("[mock-llm] prêt sur 4555"));
