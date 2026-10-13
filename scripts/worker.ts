/**
 * Worker durable : processus indépendant du navigateur.
 *   pnpm worker          # boucle continue (à superviser : systemd, conteneur, PM2…)
 *   pnpm worker --once   # traite les tâches prêtes puis s'arrête (cron / tests)
 */
import { runOnce, workerId } from "@/lib/server/worker";

const once = process.argv.includes("--once");
const controller = new AbortController();
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    console.log(`[worker] ${sig} reçu : arrêt après la tâche en cours`);
    controller.abort();
  });
}

const owner = workerId();
console.log(`[worker] démarrage ${owner}${once ? " (--once)" : ""}`);
while (!controller.signal.aborted) {
  const worked = await runOnce(owner, controller.signal);
  if (!worked) {
    if (once) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
}
console.log("[worker] arrêt");
