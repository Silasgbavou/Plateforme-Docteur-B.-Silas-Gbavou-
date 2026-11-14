// Démarrage tout-en-un pour un hébergeur à service unique : site + worker de tâches,
// sur le même disque persistant. Si l'un s'arrête, tout s'arrête (l'hébergeur redémarre).
import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";
const procs = [
  spawn("pnpm", ["next", "start", "-p", port], { stdio: "inherit" }),
  spawn("pnpm", ["worker"], { stdio: "inherit" }),
];
let stopping = false;
const stop = (code) => {
  if (stopping) return;
  stopping = true;
  for (const p of procs) p.kill("SIGTERM");
  setTimeout(() => process.exit(code ?? 0), 5000).unref();
};
for (const p of procs) p.on("exit", (code) => stop(code ?? 1));
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => stop(0));
