import { BookOpen, Heart, History, MessageSquare } from "lucide-react";

export const authInputClass =
  "h-11 w-full rounded-lg border border-border bg-bg px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/30";

// Same field, with room for a leading icon (see LoginForm/RegisterForm) — kept
// separate from authInputClass since AgeGate reuses that one without an icon.
export const authInputWithIconClass = authInputClass.replace("px-3.5", "pl-10 pr-3.5");

const BENEFITS = [
  { icon: Heart, text: "Bookmark series and build your own library" },
  { icon: History, text: "Pick up exactly where you left off, on any device" },
  { icon: MessageSquare, text: "Rate, review, and join the discussion" },
];

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col px-4 py-10 sm:py-16">
      <div className="grid overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_4px_32px_rgb(0_0_0/0.5)] lg:grid-cols-2">
        {/* Brand panel — desktop only */}
        <div className="shine-surface shine-auto relative hidden flex-col justify-between overflow-hidden border-r border-white/10 bg-gradient-to-br from-primary/25 via-bg-soft to-bg p-10 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.08)] lg:flex">
          <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 size-64 rounded-full bg-primary/25 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 size-48 rounded-full bg-highlight/15 blur-3xl" />
          <div className="relative">
            <span className="grid size-10 place-items-center rounded-xl bg-primary font-heading text-sm font-bold text-primary-foreground shadow-[0_0_20px_rgb(225_29_46/0.45)]">
              18+
            </span>
            <h2 className="mt-6 font-heading text-2xl font-bold leading-tight">
              Every title,
              <br />
              free to read.
            </h2>
            <p className="mt-2 max-w-xs text-sm text-text-muted">
              Create an account to unlock the extras — the manga stays free either way.
            </p>
          </div>
          <ul className="relative mt-8 space-y-4">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-text-muted">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-hover text-primary">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="grid size-8 place-items-center rounded-lg bg-primary font-heading text-sm font-bold text-primary-foreground shadow-[0_0_16px_rgb(225_29_46/0.4)]">
              18+
            </span>
            <span className="font-heading text-lg font-bold tracking-tight">
              <span className="text-foreground">Adult Manga</span>
              <span className="text-primary">Verse</span>
            </span>
          </div>

          <span className="mb-3 hidden size-8 place-items-center rounded-lg bg-primary/15 text-primary lg:grid">
            <BookOpen className="size-4" strokeWidth={1.75} />
          </span>
          <h1 className="font-heading text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-text-muted">{footer}</p>
    </div>
  );
}
