import { cn } from "@/lib/utils";
import { INTENSITY_LABELS } from "@/lib/validators";

const INTENSITY_STYLES: Record<string, string> = {
  MODERATE: "bg-intensity-moderate/20 text-intensity-moderate border-intensity-moderate/30",
  HIGH: "bg-intensity-high/20 text-intensity-high border-intensity-high/30",
  VERY_HIGH: "bg-intensity-very-high/20 text-intensity-very-high border-intensity-very-high/30",
  EXTREME: "bg-intensity-extreme/20 text-intensity-extreme border-intensity-extreme/30",
};

export function IntensityBadge({
  intensity,
  className,
}: {
  intensity: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded border px-2 py-0.5 text-xs font-semibold",
        INTENSITY_STYLES[intensity] ?? INTENSITY_STYLES.MODERATE,
        className,
      )}
    >
      {INTENSITY_LABELS[intensity as keyof typeof INTENSITY_LABELS] ?? intensity}
    </span>
  );
}
