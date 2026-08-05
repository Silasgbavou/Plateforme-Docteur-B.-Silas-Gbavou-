'use client';

import { useRef, useState } from 'react';

import { formatDuration } from '@/lib/slug';

/** Lecteur vidéo YouTube intégré (aucun téléchargement, lecture sur le site). */
export function YouTubeEmbed({ youtubeId, title }: { youtubeId: string; title: string }) {
  const [active, setActive] = useState(false);

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="group relative block w-full overflow-hidden rounded-2xl border border-white/10 bg-night-900"
        aria-label={`Lire la vidéo : ${title}`}
      >
        <span className="block aspect-video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            onError={(event) => {
              (event.currentTarget as HTMLImageElement).src =
                `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
            }}
          />
        </span>
        <span className="absolute inset-0 bg-gradient-to-t from-night-950/80 to-transparent" />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-gold-300 text-night-950 shadow-gold transition group-hover:scale-110">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5.5v13l11-6.5-11-6.5z" />
            </svg>
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}

/** Lecteur audio (compatible .opus / .ogg natif WhatsApp). */
export function AudioPlayer({
  src,
  title,
  durationSec,
}: {
  src: string;
  title: string;
  durationSec?: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(durationSec ?? 0);
  const [rate, setRate] = useState(1);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = (value / 100) * audio.duration;
    setProgress(value);
  }

  function cycleRate() {
    const rates = [1, 1.25, 1.5, 1.75, 2, 0.75];
    const next = rates[(rates.indexOf(rate) + 1) % rates.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  return (
    <div className="surface p-5">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const value = (event.currentTarget as HTMLAudioElement).duration;
          if (Number.isFinite(value)) setDuration(value);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget as HTMLAudioElement;
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setProgress((audio.currentTime / audio.duration) * 100);
          }
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 text-night-950 shadow-gold transition hover:scale-105"
          aria-label={playing ? 'Mettre en pause' : 'Écouter'}
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5.5v13l11-6.5-11-6.5z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ivory-50">{title}</p>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={(event) => seek(Number(event.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-gold-400"
            aria-label="Position de lecture"
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-ivory-100/45">
            <span>{formatDuration((progress / 100) * duration) || '0:00'}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={cycleRate}
          className="shrink-0 rounded-lg border border-white/12 px-2.5 py-1 text-[11.5px] font-semibold text-ivory-100/75 transition hover:border-gold-300/40 hover:text-gold-200"
          aria-label="Vitesse de lecture"
        >
          ×{rate}
        </button>
      </div>
    </div>
  );
}
