"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  ChevronDown,
  Crown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  User,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mainNav, siteConfig } from "@/lib/site";
import { SearchBar } from "@/components/public/SearchBar";

export type HeaderUser = {
  name?: string | null;
  email?: string | null;
  role: string;
} | null;

export type HeaderGenre = { name: string; slug: string };

function GenresDropdown({ genres }: { genres: HeaderGenre[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-lg px-3 py-2 font-ui text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-foreground"
      >
        Genres
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} strokeWidth={1.5} />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div role="menu" className="glass-panel absolute left-0 z-50 mt-2 grid w-[440px] max-w-[90vw] grid-cols-2 gap-0.5 rounded-xl p-2 shadow-[0_8px_32px_rgb(0_0_0/0.5)]">
            {genres.length === 0 ? (
              <p className="col-span-2 px-3 py-2 text-sm text-text-muted">No genres yet.</p>
            ) : (
              genres.map((g) => (
                <Link
                  key={g.slug}
                  href={`/genre/${g.slug}`}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  {g.name}
                </Link>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={`${siteConfig.name} home`}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary font-heading text-sm font-bold text-primary-foreground shadow-[0_0_16px_rgb(225_29_46/0.4)]">
        18+
      </span>
      <span className="hidden font-heading text-lg font-bold tracking-tight sm:inline">
        <span className="text-foreground">Adult Manga</span>
        <span className="text-primary">Verse</span>
      </span>
    </Link>
  );
}

function UserMenu({ user }: { user: NonNullable<HeaderUser> }) {
  const [open, setOpen] = useState(false);
  const isStaff = user.role === "ADMIN" || user.role === "MOD";
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn-3d-ghost flex items-center gap-2 rounded-lg border border-border bg-surface py-1 pl-1 pr-2.5 transition-colors hover:bg-surface-hover"
      >
        <span className="grid size-7 place-items-center rounded-md bg-primary font-ui text-sm font-bold text-primary-foreground">
          {initial}
        </span>
        <span className="hidden max-w-28 truncate font-ui text-sm font-medium sm:inline">
          {user.name || user.email}
        </span>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="glass-panel absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl p-1 shadow-[0_8px_32px_rgb(0_0_0/0.5)]"
          >
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium">{user.name || "Reader"}</p>
              <p className="truncate text-xs text-text-muted">{user.email}</p>
            </div>
            <Link href="/library" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-foreground" role="menuitem">
              <Heart className="size-4" strokeWidth={1.5} /> My Library
            </Link>
            <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-foreground" role="menuitem">
              <UserRound className="size-4" strokeWidth={1.5} /> Account
            </Link>
            {isStaff ? (
              <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-foreground" role="menuitem">
                <LayoutDashboard className="size-4" strokeWidth={1.5} /> Admin panel
              </Link>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                await signOut({ redirect: false });
                window.location.href = "/";
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/10"
              role="menuitem"
            >
              <LogOut className="size-4" strokeWidth={1.5} /> Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function SiteHeader({ genres = [] }: { genres?: HeaderGenre[] }) {
  const [open, setOpen] = useState(false);
  // Session is read client-side (not passed from the server layout) so that
  // the layout itself has no per-request dynamic dependency and public pages
  // can be cached/ISR'd instead of fully re-rendering on every request. Cost:
  // on first paint (before hydration resolves the session) this always shows
  // the signed-out state — a brief, harmless flash for returning users.
  const { data: session } = useSession();
  const user: HeaderUser = session?.user
    ? { name: session.user.name, email: session.user.email, role: session.user.role }
    : null;
  const isStaff = user && (user.role === "ADMIN" || user.role === "MOD");

  return (
    <header className="glass-panel sticky top-0 z-50 border-x-0 border-t-0 shadow-[0_1px_0_0_rgb(225_29_46/0.12)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid size-11 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-foreground md:hidden"
          >
            {open ? <X className="size-5" strokeWidth={1.5} /> : <Menu className="size-5" strokeWidth={1.5} />}
          </button>
          <Logo />
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {mainNav.map((item) => (
            <Fragment key={item.href}>
              <Link
                href={item.href}
                className="rounded-lg px-3 py-2 font-ui text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                {item.label}
              </Link>
              {item.href === "/browse" ? <GenresDropdown genres={genres} /> : null}
            </Fragment>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link href="/subscribe" aria-label="Premium" title="Go Premium" className="hidden size-11 place-items-center rounded-lg text-warning transition-colors hover:bg-surface sm:grid">
            <Crown className="size-5" strokeWidth={1.5} />
          </Link>
          <div className="hidden md:block">
            <SearchBar />
          </div>
          <Link href="/search" aria-label="Search" className="grid size-11 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-foreground md:hidden">
            <Search className="size-5" strokeWidth={1.5} />
          </Link>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              href="/login"
              className="btn-3d inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97]"
            >
              <User className="size-4" strokeWidth={2} />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "grid overflow-hidden border-t border-border transition-[grid-template-rows] duration-200 md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0">
          <nav className="flex flex-col gap-1 px-4 py-3" aria-label="Mobile">
            {mainNav.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-ui text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-foreground">
                {item.label}
              </Link>
            ))}
            {genres.length > 0 ? (
              <div className="px-3 py-2">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Genres</p>
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <Link key={g.slug} href={`/genre/${g.slug}`} onClick={() => setOpen(false)} className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:border-primary/50 hover:text-highlight">
                      {g.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            <Link href="/library" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-ui text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-foreground">
              My Library
            </Link>
            {user ? (
              <Link href="/account" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-ui text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-foreground">
                Account
              </Link>
            ) : null}
            {isStaff ? (
              <Link href="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-ui text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-foreground">
                Admin panel
              </Link>
            ) : null}
            {user ? (
              <button
                type="button"
                onClick={async () => {
                  await signOut({ redirect: false });
                  window.location.href = "/";
                }}
                className="rounded-lg px-3 py-3 text-left font-ui text-sm font-medium text-danger transition-colors hover:bg-danger/10"
              >
                Sign out
              </button>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-ui text-sm font-medium text-primary transition-colors hover:bg-surface">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
