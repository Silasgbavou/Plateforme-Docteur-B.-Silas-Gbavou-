/** Emblème du ministère : l'arche doctorale, tracé vectoriel unique réutilisé (logo, médaillon, favicon). */
export function ArchMark({ size = 32, className, title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 40 46"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      {title ? <title>{title}</title> : null}
      <path d="M4 44V20a16 16 0 0 1 32 0v24" />
      <path d="M11 44V21a9 9 0 0 1 18 0v23" opacity="0.6" />
      <path d="M20 12v32" opacity="0.6" />
      <path d="M2 44h36" />
    </svg>
  );
}
