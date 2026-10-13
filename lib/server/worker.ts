import "server-only";
import { hostname } from "node:os";
import { claimNext, complete, failOrRetry, LeaseLostError, type Job } from "./jobs";
import { runExtractJob } from "./editions";
import { runEmbedJob } from "./embed-job";
import { syncDrive } from "./drive";

type Handler = (job: Job, owner: string, signal: AbortSignal) => Promise<void>;

export const HANDLERS: Record<string, Handler> = {
  "edition.extract": (job, owner) => runExtractJob(job, owner),
  "passages.embed": runEmbedJob,
  "drive.sync": async (job, owner) => {
    await syncDrive(job, owner);
  },
};

export const workerId = () => `${hostname()}:${process.pid}`;

/** Exécute au plus une tâche. Retourne false s'il n'y avait rien à faire. */
export async function runOnce(owner: string, signal: AbortSignal): Promise<boolean> {
  const job = claimNext(owner, Object.keys(HANDLERS));
  if (!job) return false;
  const handler = HANDLERS[job.type]!;
  try {
    await handler(job, owner, signal);
    complete(job, owner);
    console.log(`[worker] tâche ${job.type} ${job.id} terminée`);
  } catch (e) {
    if (e instanceof LeaseLostError) {
      console.warn(`[worker] bail perdu ${job.id} : abandon local`);
      return true;
    }
    failOrRetry(job, owner, e);
    console.warn(`[worker] tâche ${job.type} ${job.id} : échec/reprogrammée`);
  }
  return true;
}
