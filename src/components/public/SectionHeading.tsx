import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-3 font-heading text-xl font-semibold sm:text-2xl">
        <span className="h-6 w-[3px] rounded-full bg-primary" aria-hidden />
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-text-muted transition-colors hover:text-highlight"
        >
          View all
          <ArrowRight className="size-4" strokeWidth={1.5} />
        </Link>
      ) : null}
    </div>
  );
}
