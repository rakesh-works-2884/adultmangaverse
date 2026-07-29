"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteStaticPage } from "@/actions/staticpages";
import { btnDanger } from "@/components/admin/styles";

export function DeletePageButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm(`Delete the “${title}” page?`)) return;
    startTransition(async () => {
      const res = await deleteStaticPage(id);
      if (!res.ok) return alert(res.error);
      router.refresh();
    });
  }

  return (
    <button type="button" onClick={remove} disabled={pending} className={btnDanger} title="Delete">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}
