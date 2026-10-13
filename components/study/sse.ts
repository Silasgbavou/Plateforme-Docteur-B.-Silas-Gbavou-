import type { StudyEvent } from "@/lib/domain/study-types";

/** Lecture d'un flux SSE issu d'un POST (EventSource ne permet pas POST). */
export async function* readSse(res: Response): AsyncGenerator<StudyEvent> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = "";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (!event || !data) continue;
      try {
        yield { event, data: JSON.parse(data) } as StudyEvent;
      } catch {
        /* bloc illisible ignoré */
      }
    }
  }
}
