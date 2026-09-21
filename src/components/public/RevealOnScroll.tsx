import type { ReactNode } from "react";

export function RevealOnScroll({ children, className }: { children: ReactNode; className?: string; delayMs?: number }) {
  return <div className={className}>{children}</div>;
}
