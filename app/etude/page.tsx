import type { Metadata } from "next";
import { StudyApp } from "@/components/study/StudyApp";
import { STUDY_TITLE } from "@/lib/domain/contacts";
import { listPublishedWorks } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Étude", alternates: { canonical: "/etude" } };

type SP = Promise<{ ouvrage?: string; q?: string; contexte?: string }>;

export default async function StudyPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const works = listPublishedWorks().map((w) => ({ id: w.id, title: w.title, theme: w.theme, hasEdition: Boolean(w.edition) }));
  const initialWork = works.some((w) => w.id === sp.ouvrage) ? sp.ouvrage! : null;
  const themes = [...new Set(works.map((w) => w.theme).filter((t): t is string => Boolean(t)))];
  return (
    <div className="study">
      <StudyApp
        title={STUDY_TITLE}
        works={works}
        initialWorkId={initialWork}
        initialQuestion={typeof sp.q === "string" ? sp.q.slice(0, 1200) : ""}
        initialContext={sp.contexte === "predications" ? "predications" : "textes"}
        themes={themes}
      />
    </div>
  );
}
