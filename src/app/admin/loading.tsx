import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return <div role="status" className="flex items-center gap-3 rounded-xl border border-border bg-surface p-6 text-sm">
    <Loader2 className="size-5 animate-spin text-primary" /> Loading admin page…
  </div>;
}
