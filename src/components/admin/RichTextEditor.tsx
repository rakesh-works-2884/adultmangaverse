"use client";

import { useReducer, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Link2Off,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadContentImage } from "@/actions/media";

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded transition-colors",
        active ? "bg-primary text-white" : "text-text-muted hover:bg-surface hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Uploads a File and inserts it as an image at the current ProseMirror selection. */
async function uploadAndInsertAt(view: EditorView, file: File): Promise<boolean> {
  const fd = new FormData();
  fd.set("file", file);
  const res = await uploadContentImage(fd);
  if (!res.ok || !res.data) {
    alert(res.ok ? "Upload failed." : res.error);
    return false;
  }
  const imageType = view.state.schema.nodes.image;
  if (!imageType) return false;
  const node = imageType.create({ src: res.data.url });
  view.dispatch(view.state.tr.replaceSelectionWith(node));
  return true;
}

export function RichTextEditor({
  value,
  onChange,
  allowImages = false,
}: {
  value: string;
  onChange: (html: string) => void;
  /** Enables pasting/dropping/inserting inline images (uploaded via uploadContentImage). */
  allowImages?: boolean;
}) {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false },
      }),
      ...(allowImages ? [TiptapImage.configure({ inline: false })] : []),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "richtext min-h-[160px] w-full px-3 py-2 text-sm outline-none",
      },
      handlePaste: allowImages
        ? (view, event) => {
            const file = Array.from(event.clipboardData?.items ?? [])
              .find((item) => item.type.startsWith("image/"))
              ?.getAsFile();
            if (!file) return false;
            event.preventDefault();
            setUploading(true);
            void uploadAndInsertAt(view, file).finally(() => setUploading(false));
            return true;
          }
        : undefined,
      handleDrop: allowImages
        ? (view, event) => {
            const file = event.dataTransfer?.files?.[0];
            if (!file || !file.type.startsWith("image/")) return false;
            event.preventDefault();
            setUploading(true);
            void uploadAndInsertAt(view, file).finally(() => setUploading(false));
            return true;
          }
        : undefined,
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onSelectionUpdate: () => forceUpdate(),
    onTransaction: () => forceUpdate(),
  });

  function toggleLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove):", previous ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadContentImage(fd);
      if (!res.ok || !res.data) {
        alert(res.ok ? "Upload failed." : res.error);
        return;
      }
      editor.chain().focus().setImage({ src: res.data.url }).run();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-bg-soft p-1.5">
        {editor ? (
          <>
            <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Link" active={editor.isActive("link")} onClick={toggleLink}>
              <Link2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>
              <Link2Off className="size-4" />
            </ToolbarButton>
            {allowImages ? (
              <>
                <ToolbarButton label="Insert image" onClick={() => fileInputRef.current?.click()}>
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                </ToolbarButton>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickImage} className="hidden" />
              </>
            ) : null}
          </>
        ) : null}
        {allowImages && uploading ? <span className="ml-1 text-xs text-text-muted">Uploading image…</span> : null}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
