"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";

type Result = { slug: string; title: string; coverUrl: string | null; type: string };

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <form onSubmit={submit}>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search titles, artists…"
          className="h-9 w-40 rounded-lg border border-border bg-bg pl-8 pr-2 text-sm text-foreground outline-none transition-all placeholder:text-text-muted focus:w-56 focus:border-primary lg:w-52 lg:focus:w-64"
        />
        {loading ? <Loader2 className="absolute right-2 top-1/2 size-4 -translate-y-1/2 animate-spin text-text-muted" /> : null}
      </form>

      {open && query.trim().length >= 2 ? (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[0_8px_32px_rgb(0_0_0/0.5)]">
          {results.length === 0 && !loading ? (
            <p className="px-3 py-4 text-center text-sm text-text-muted">No matches.</p>
          ) : (
            results.map((r) => (
              <Link key={r.slug} href={`/manga/${r.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-hover">
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded border border-border bg-bg-soft">
                  {r.coverUrl ? <Image src={r.coverUrl} alt="" fill sizes="40px" className="object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-text-muted">{r.type}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
