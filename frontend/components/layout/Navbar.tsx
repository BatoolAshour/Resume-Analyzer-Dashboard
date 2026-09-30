import { ScanSearch } from "lucide-react";
import { ApiStatus } from "@/components/layout/ApiStatus";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const links = [
  { href: "#analyzer", label: "Analyzer" },
  { href: "#results", label: "Results" },
  { href: "#how-it-works", label: "How it works" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5 font-semibold text-ink">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-white">
            <ScanSearch className="size-[18px]" aria-hidden />
          </span>
          <span className="text-[15px] tracking-tight">AI Resume Analyzer</span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-muted hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ApiStatus />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
