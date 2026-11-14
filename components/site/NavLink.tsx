"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children, onNavigate }: { href: string; children: React.ReactNode; onNavigate?: () => void }) {
  const pathname = usePathname();
  const base = href.split("#")[0] || "/";
  const active = !href.includes("#") && (pathname === base || (base !== "/" && pathname.startsWith(`${base}/`)));
  return (
    <Link href={href} className="nav-link" aria-current={active ? "page" : undefined} onClick={onNavigate}>
      {children}
    </Link>
  );
}
