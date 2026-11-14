import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/server/db";
import { backoffMs, claimNext, complete, enqueue, failOrRetry, getJob, heartbeat, LeaseLostError, RetryLaterError, retryJob } from "@/lib/server/jobs";

beforeEach(() => {
  db().exec("DELETE FROM jobs");
  vi.useRealTimers();
});

describe("file durable", () => {
  it("déduplique les tâches actives", () => {
    const a = enqueue("t", { x: 1 }, "cle");
    const b = enqueue("t", { x: 2 }, "cle");
    expect(b.id).toBe(a.id);
  });

  it("réserve avec bail, puis une autre instance reprend après expiration du bail", () => {
    vi.useFakeTimers({ now: 1_000_000 });
    enqueue("t", {});
    const j1 = claimNext("w1")!;
    expect(j1.leaseOwner).toBe("w1");
    expect(claimNext("w2")).toBeNull();
    vi.setSystemTime(1_000_000 + 121_000); // bail de 120 s expiré (worker « mort »)
    const j2 = claimNext("w2")!;
    expect(j2.id).toBe(j1.id);
    expect(j2.attempts).toBe(2);
    // l'ancien worker a perdu son bail
    expect(() => heartbeat(j1, "w1", { done: 1 })).toThrow(LeaseLostError);
  });

  it("échec : nouvelle tentative différée avec backoff, puis dead-letter", () => {
    vi.useFakeTimers({ now: 5_000_000 });
    const j = enqueue("t", {}, undefined, 2);
    let claimed = claimNext("w")!;
    failOrRetry(claimed, "w", new Error("boom"));
    let row = getJob(j.id)!;
    expect(row.status).toBe("en_attente");
    expect(row.runAfter).toBeGreaterThanOrEqual(5_000_000 + 48_000);
    vi.setSystemTime(row.runAfter + 1);
    claimed = claimNext("w")!;
    failOrRetry(claimed, "w", new Error("boom 2"));
    row = getJob(j.id)!;
    expect(row.status).toBe("echec");
    expect(row.lastError).toBe("boom 2");
    expect(retryJob(j.id)).toBe(true);
    expect(getJob(j.id)!.status).toBe("en_attente");
  });

  it("limitation de débit : replanifiée sans consommer de tentative", () => {
    const j = enqueue("t", {}, undefined, 1);
    const c = claimNext("w")!;
    failOrRetry(c, "w", new RetryLaterError("429", 30_000));
    const row = getJob(j.id)!;
    expect(row.status).toBe("en_attente");
    expect(row.attempts).toBe(0);
  });

  it("termine une tâche et enregistre la progression", () => {
    enqueue("t", {});
    const c = claimNext("w")!;
    heartbeat(c, "w", { done: 3, total: 10, checkpoint: { page: 3 } });
    complete(c, "w");
    const row = getJob(c.id)!;
    expect(row).toMatchObject({ status: "termine", progressDone: 3, progressTotal: 10 });
  });

  it("backoff historique 60/120/240/480/900 s avec gigue ±20 %", () => {
    expect(backoffMs(1, () => 0.5)).toBe(60_000);
    expect(backoffMs(5, () => 0.5)).toBe(900_000);
    expect(backoffMs(9, () => 0)).toBe(720_000);
  });
});
