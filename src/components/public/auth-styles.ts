export const authInputClass =
  "h-11 w-full rounded-lg border border-border bg-bg px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/30";

// Same field, with room for a leading icon (see LoginForm/RegisterForm) — kept
// separate from authInputClass since AgeGate reuses that one without an icon.
export const authInputWithIconClass = authInputClass.replace("px-3.5", "pl-10 pr-3.5");

