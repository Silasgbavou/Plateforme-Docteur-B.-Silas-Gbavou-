'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PILLARS } from '@/lib/taxonomy';

type Tab = 'youtube' | 'audio' | 'livre' | 'ecrit';

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'youtube', label: 'Vidéo YouTube', hint: 'Import + transcription + classement IA' },
  { key: 'audio', label: 'Audio (.opus WhatsApp)', hint: 'Transfert direct depuis WhatsApp' },
  { key: 'livre', label: 'Livre PDF', hint: 'Dépôt protégé + licence nominative' },
  { key: 'ecrit', label: 'Enseignement écrit', hint: 'Rédaction directe' },
];

export function PublishStudio() {
  const [tab, setTab] = useState<Tab>('youtube');

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              tab === item.key
                ? 'border-gold-300/50 bg-gold-300/10'
                : 'border-white/12 bg-white/[0.03] hover:border-white/25'
            }`}
          >
            <span
              className={`block text-[13.5px] font-semibold ${
                tab === item.key ? 'text-gold-100' : 'text-ivory-50'
              }`}
            >
              {item.label}
            </span>
            <span className="mt-0.5 block text-[11px] text-ivory-100/45">{item.hint}</span>
          </button>
        ))}
      </div>

      {tab === 'youtube' && <YouTubeForm />}
      {tab === 'audio' && <AudioForm />}
      {tab === 'livre' && <BookForm />}
      {tab === 'ecrit' && <ArticleForm />}
    </div>
  );
}

// ─────────────────────────── Import YouTube ───────────────────────────

function YouTubeForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'single' | 'channel'>('single');
  const state = useSubmitState();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await state.run(async () => {
      const response = await fetch('/api/admin/youtube', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode,
          url: String(form.get('url') ?? ''),
          channelId: String(form.get('channelId') ?? ''),
          limit: Number(form.get('limit') ?? 10),
          publish: form.get('publish') === 'on',
          transcript: String(form.get('transcript') ?? '') || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Import impossible.');
      router.refresh();

      const lines = (data.results as Record<string, unknown>[]).map(
        (r) =>
          `${r.status === 'created' ? 'Créé' : 'Mis à jour'} — ${r.title} → ${r.pillar} / ${r.subRubric}${
            r.transcript ? '' : ' (⚠ sans transcription)'
          }`,
      );
      return `${data.imported} vidéo(s) traitée(s).\n${lines.join('\n')}`;
    });
  }

  return (
    <FormShell
      title="Importer depuis YouTube"
      description="Le système récupère les métadonnées et la transcription automatique, puis l’IA déduit la thématique et range la vidéo dans la bonne sous-rubrique du bon pilier."
      onSubmit={submit}
      state={state}
      submitLabel="Lancer l’import"
    >
      <div className="flex gap-2">
        {(['single', 'channel'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition ${
              mode === value
                ? 'border-gold-300/50 bg-gold-300/10 text-gold-100'
                : 'border-white/12 text-ivory-100/70'
            }`}
          >
            {value === 'single' ? 'Une vidéo' : 'Toute la chaîne'}
          </button>
        ))}
      </div>

      {mode === 'single' ? (
        <>
          <Field label="Lien ou identifiant de la vidéo" htmlFor="url">
            <input
              id="url"
              name="url"
              required
              placeholder="https://www.youtube.com/watch?v=..."
              className="field"
            />
          </Field>
          <Field
            label="Transcription (facultatif)"
            htmlFor="transcript"
            hint="À coller si YouTube ne fournit pas de sous-titres. C’est ce texte qui alimente l’IA."
          >
            <textarea id="transcript" name="transcript" rows={6} className="field resize-y" />
          </Field>
        </>
      ) : (
        <>
          <Field
            label="Identifiant de la chaîne"
            htmlFor="channelId"
            hint="Laissez vide pour utiliser YOUTUBE_CHANNEL_ID."
          >
            <input id="channelId" name="channelId" placeholder="UC..." className="field" />
          </Field>
          <Field label="Nombre de vidéos à importer" htmlFor="limit">
            <input
              id="limit"
              name="limit"
              type="number"
              min={1}
              max={50}
              defaultValue={10}
              className="field"
            />
          </Field>
        </>
      )}

      <Checkbox name="publish" label="Publier immédiatement et indexer pour l’assistant IA" />
    </FormShell>
  );
}

// ──────────────────────────── Upload audio ────────────────────────────

function AudioForm() {
  const router = useRouter();
  const state = useSubmitState();
  const [fileName, setFileName] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await state.run(async () => {
      const response = await fetch('/api/admin/audios', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Transfert impossible.');
      router.refresh();
      (event.target as HTMLFormElement).reset();
      setFileName('');
      return `« ${data.title} » enregistré.${data.chunks ? ` ${data.chunks} fragments indexés.` : ''}${
        data.note ? `\n${data.note}` : ''
      }`;
    });
  }

  return (
    <FormShell
      title="Transférer un audio"
      description="Le format natif WhatsApp (.opus) est accepté sans conversion. Formats également pris en charge : .ogg, .m4a, .mp3, .wav, .webm."
      onSubmit={submit}
      state={state}
      submitLabel="Transférer l’audio"
    >
      <label className="block cursor-pointer rounded-2xl border border-dashed border-white/20 bg-white/[0.02] px-6 py-8 text-center transition hover:border-gold-300/40 hover:bg-white/[0.04]">
        <input
          type="file"
          name="file"
          accept=".opus,.ogg,.oga,.m4a,.mp3,.wav,.webm,audio/*"
          required
          className="sr-only"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
        />
        <span className="block font-display text-lg text-ivory-50">
          {fileName || 'Choisir un fichier audio'}
        </span>
        <span className="mt-1 block text-[12px] text-ivory-100/45">
          Glissez le message WhatsApp exporté, ou cliquez pour parcourir · 200 Mo maximum
        </span>
      </label>

      <Field label="Titre de l’enseignement" htmlFor="audio-title">
        <input id="audio-title" name="title" required className="field" />
      </Field>

      <Field
        label="Transcription"
        htmlFor="audio-transcript"
        hint="Indispensable pour que l’assistant IA puisse répondre sur cet audio. Si un service de transcription est configuré, laissez vide."
      >
        <textarea id="audio-transcript" name="transcript" rows={7} className="field resize-y" />
      </Field>

      <Field label="Résumé (facultatif)" htmlFor="audio-summary" hint="Généré par l’IA si laissé vide.">
        <textarea id="audio-summary" name="summary" rows={2} className="field resize-y" />
      </Field>

      <ClassificationPicker />
      <Checkbox name="publish" value="true" label="Publier immédiatement et indexer" />
    </FormShell>
  );
}

// ───────────────────────────── Upload livre ─────────────────────────────

function BookForm() {
  const router = useRouter();
  const state = useSubmitState();
  const [fileName, setFileName] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await state.run(async () => {
      const response = await fetch('/api/admin/livres', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Dépôt impossible.');
      router.refresh();
      (event.target as HTMLFormElement).reset();
      setFileName('');
      return `« ${data.title} » déposé (${data.pageCount ?? '?'} pages).${
        data.note ? `\n${data.note}` : ''
      }`;
    });
  }

  return (
    <FormShell
      title="Déposer un livre PDF"
      description="Le fichier est stocké hors du web public. Il n’est accessible que par la liseuse protégée et par la délivrance d’exemplaires nominatifs filigranés."
      onSubmit={submit}
      state={state}
      submitLabel="Déposer l’ouvrage"
    >
      <label className="block cursor-pointer rounded-2xl border border-dashed border-white/20 bg-white/[0.02] px-6 py-8 text-center transition hover:border-gold-300/40 hover:bg-white/[0.04]">
        <input
          type="file"
          name="file"
          accept="application/pdf,.pdf"
          required
          className="sr-only"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
        />
        <span className="block font-display text-lg text-ivory-50">
          {fileName || 'Choisir le fichier PDF'}
        </span>
        <span className="mt-1 block text-[12px] text-ivory-100/45">120 Mo maximum</span>
      </label>

      <Field label="Titre de l’ouvrage" htmlFor="book-title">
        <input id="book-title" name="title" required className="field" />
      </Field>

      <Field label="Présentation (quatrième de couverture)" htmlFor="book-summary">
        <textarea id="book-summary" name="summary" rows={3} className="field resize-y" />
      </Field>

      <Field
        label="Texte intégral pour l’IA (facultatif)"
        htmlFor="book-fulltext"
        hint="Collez ici le texte du livre pour que l’assistant puisse répondre sur son contenu et le citer."
      >
        <textarea id="book-fulltext" name="fullText" rows={7} className="field resize-y" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ISBN (facultatif)" htmlFor="book-isbn">
          <input id="book-isbn" name="isbn" className="field" />
        </Field>
        <Field label="URL de couverture (facultatif)" htmlFor="book-cover">
          <input id="book-cover" name="coverUrl" type="url" className="field" />
        </Field>
      </div>

      <ClassificationPicker />
      <Checkbox
        name="allowDownload"
        value="true"
        defaultChecked
        label="Autoriser le téléchargement personnel (exemplaire nominatif filigrané)"
      />
      <Checkbox name="publish" value="true" label="Publier immédiatement" />
    </FormShell>
  );
}

// ────────────────────────── Enseignement écrit ──────────────────────────

function ArticleForm() {
  const router = useRouter();
  const state = useSubmitState();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await state.run(async () => {
      const response = await fetch('/api/admin/contenus', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'),
          summary: form.get('summary') ?? '',
          body: form.get('body'),
          pillarKey: form.get('pillarKey') || undefined,
          subRubricSlug: form.get('subRubricSlug') || undefined,
          tags: form.get('tags') ?? '',
          publish: form.get('publish') === 'true',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Publication impossible.');
      router.refresh();
      (event.target as HTMLFormElement).reset();
      return `Enseignement enregistré.${data.chunks ? ` ${data.chunks} fragments indexés.` : ''}`;
    });
  }

  return (
    <FormShell
      title="Rédiger un enseignement"
      description="Mise en forme Markdown allégée : ## pour un titre, - pour une liste, ** pour le gras, > pour une citation."
      onSubmit={submit}
      state={state}
      submitLabel="Enregistrer l’enseignement"
    >
      <Field label="Titre" htmlFor="article-title">
        <input id="article-title" name="title" required className="field" />
      </Field>

      <Field label="Résumé (facultatif)" htmlFor="article-summary" hint="Généré par l’IA si laissé vide.">
        <textarea id="article-summary" name="summary" rows={2} className="field resize-y" />
      </Field>

      <Field label="Corps de l’enseignement" htmlFor="article-body">
        <textarea
          id="article-body"
          name="body"
          rows={16}
          required
          className="field resize-y font-mono text-[13px] leading-relaxed"
        />
      </Field>

      <Field label="Mots-clés (séparés par des virgules)" htmlFor="article-tags">
        <input id="article-tags" name="tags" className="field" />
      </Field>

      <ClassificationPicker />
      <Checkbox name="publish" value="true" label="Publier immédiatement et indexer" />
    </FormShell>
  );
}

// ───────────────────────────── Éléments partagés ─────────────────────────

function ClassificationPicker() {
  const [pillarKey, setPillarKey] = useState('');
  const pillar = PILLARS.find((p) => p.key === pillarKey);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="label !mb-2">Classement</p>
      <p className="mb-3 text-[12px] leading-relaxed text-ivory-100/50">
        Laissez « Automatique » pour que l’IA déduise le pilier et la sous-rubrique à partir du
        contenu. Un choix manuel prévaut toujours sur l’IA.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          name="pillarKey"
          value={pillarKey}
          onChange={(event) => setPillarKey(event.target.value)}
          className="field"
          aria-label="Pilier"
        >
          <option value="">Automatique (IA)</option>
          {PILLARS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.title}
            </option>
          ))}
        </select>

        <select name="subRubricSlug" className="field" disabled={!pillar} aria-label="Sous-rubrique">
          <option value="">
            {pillar ? 'Sous-rubrique (automatique)' : 'Choisir d’abord un pilier'}
          </option>
          {pillar?.subRubrics.map((sub) => (
            <option key={sub.slug} value={sub.slug}>
              {sub.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FormShell({
  title,
  description,
  onSubmit,
  state,
  submitLabel,
  children,
}: {
  title: string;
  description: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  state: ReturnType<typeof useSubmitState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="surface-strong space-y-5 p-6">
      <div>
        <h2 className="font-display text-xl text-ivory-50">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ivory-100/55">{description}</p>
      </div>

      {children}

      {state.error && (
        <p className="whitespace-pre-wrap rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="whitespace-pre-wrap rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-[13px] text-emerald-200">
          {state.success}
        </p>
      )}

      <button type="submit" disabled={state.busy} className="btn-primary">
        {state.busy ? 'Traitement en cours…' : submitLabel}
      </button>
      {state.busy && (
        <p className="text-[11.5px] text-ivory-100/40">
          L’analyse IA et l’indexation peuvent prendre une à deux minutes sur les longs contenus.
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] leading-relaxed text-ivory-100/40">{hint}</p>}
    </div>
  );
}

function Checkbox({
  name,
  label,
  value,
  defaultChecked,
}: {
  name: string;
  label: string;
  value?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[13.5px] text-ivory-100/75">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 accent-gold-400"
      />
      {label}
    </label>
  );
}

function useSubmitState() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function run(task: () => Promise<string>) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      setSuccess(await task());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.');
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, success, run };
}
