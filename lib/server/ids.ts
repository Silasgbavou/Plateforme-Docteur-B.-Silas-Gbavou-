import { createHash, randomBytes, randomUUID } from "node:crypto";

export const newId = () => randomUUID();
export const requestId = () => randomBytes(6).toString("hex");
export const sha256 = (input: string | Buffer | Uint8Array) => createHash("sha256").update(input).digest("hex");
export const nowIso = () => new Date().toISOString();
