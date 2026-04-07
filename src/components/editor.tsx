import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useNoteStore } from "../store/note-store";
import TurndownService from "turndown";
import { marked } from "marked";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

/** Convert markdown string to HTML for Tiptap */
function mdToHtml(md: string, assetsDir: string | null): string {
  let processed = md;
  // Convert absolute file paths to Tauri asset URLs
  processed = processed.replace(
    /!\[([^\]]*)\]\((\/.+?)\)/g,
    (_match, alt, path) => `![${alt}](${convertFileSrc(path)})`
  );
  // Convert relative ../assets/ paths to absolute using assetsDir
  if (assetsDir) {
    processed = processed.replace(
      /!\[([^\]]*)\]\(\.\.\/(assets\/.+?)\)/g,
      (_match, alt, relPath) => {
        const absPath = `${assetsDir}/${relPath.replace("assets/", "")}`;
        return `![${alt}](${convertFileSrc(absPath)})`;
      }
    );
  }
  return marked.parse(processed, { async: false }) as string;
}

/** Convert Tiptap HTML back to markdown for saving */
function htmlToMd(html: string): string {
  return turndown.turndown(html);
}

export default function Editor() {
  const { selectedPath, content, contentVersion, isModified, updateContent, saveNote, assetsDir, loadAssetsDir, setShowCreateInput } =
    useNoteStore();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isUpdatingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "Start writing..." }),
    ],
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
      handlePaste(_view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return true;

            const reader = new FileReader();
            reader.onload = async () => {
              const base64 = reader.result as string;
              try {
                const absPath = await invoke<string>("notes_save_image", {
                  data: base64,
                  filename: file.name || "paste.png",
                });
                const assetUrl = convertFileSrc(absPath);
                editor?.chain().focus().setImage({ src: assetUrl }).run();
              } catch {
                editor?.chain().focus().setImage({ src: base64 }).run();
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate({ editor: e }) {
      if (isUpdatingRef.current) return;
      const md = htmlToMd(e.getHTML());
      updateContent(md);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveNote(), 1500);
    },
  });

  // Load assets dir on mount
  useEffect(() => {
    loadAssetsDir();
  }, []);

  // Load content into editor when note changes or content loaded from disk
  useEffect(() => {
    if (!editor || !selectedPath) return;
    isUpdatingRef.current = true;
    const html = mdToHtml(content, assetsDir);
    editor.commands.setContent(html);
    isUpdatingRef.current = false;
    editor.commands.focus("end");
  }, [selectedPath, contentVersion, assetsDir]);

  // Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveNote();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveNote]);

  /* ── Empty state ── */
  if (!selectedPath) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--s5)",
            animation: "float-in 0.5s cubic-bezier(0.4,0,0.2,1)",
            padding: "48px 56px",
            borderRadius: "var(--r5)",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "0 16px 64px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, rgba(124,140,245,0.15), rgba(99,102,241,0.06))",
              border: "1px solid rgba(124,140,245,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "glow-pulse 3s ease infinite",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none" style={{ color: "var(--accent)" }}>
              <path
                d="M16 5C10.5 5 6 9.5 6 15c0 3.5 1.8 6.6 4.5 8.4V27a1.5 1.5 0 001.5 1.5h8A1.5 1.5 0 0021.5 27v-3.6C24.2 21.6 26 18.5 26 15c0-5.5-4.5-10-10-10z"
                stroke="currentColor" strokeWidth="1.3"
              />
              <path d="M13 30h6M14 16a2 2 0 014 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.4" />
            </svg>
          </div>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
            <span style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
              Start capturing your thoughts
            </span>
            <span style={{ fontSize: "14px", color: "var(--text-tertiary)", fontWeight: 400 }}>
              Select a note or create a new one
            </span>
          </div>
          <button
            className="empty-cta"
            onClick={() => setShowCreateInput(true)}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6.5 2v9M2 6.5h9" />
            </svg>
            Create new note
          </button>
        </div>

        <style>{`
          .empty-cta {
            display: flex; align-items: center; gap: 8px;
            padding: 11px 24px; font-size: 13px; font-weight: 600;
            border-radius: var(--r3); border: none;
            background: var(--accent-gradient); color: #0c0e12; cursor: pointer;
            letter-spacing: -0.01em;
            box-shadow: 0 4px 16px var(--accent-glow);
            transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
          }
          .empty-cta:hover {
            background: var(--accent-hover);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px var(--accent-glow);
          }
          .empty-cta:active {
            transform: scale(0.97) translateY(0);
            box-shadow: 0 2px 8px var(--accent-glow);
          }
        `}</style>
      </div>
    );
  }

  /* ── Editor ── */
  const fileName = selectedPath.split("/").pop()?.replace(".md", "") || selectedPath;
  const breadcrumb = selectedPath.replace(".md", "").split("/").join(" › ");

  return (
    <div className="flex-1 flex flex-col h-full" style={{ background: "var(--bg-base)" }}>
      {/* Title bar */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ height: "50px", padding: "0 var(--s6)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center" style={{ gap: "var(--s3)" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.02em" }}>{fileName}</span>
          {isModified && (
            <div style={{
              width: "5px", height: "5px", borderRadius: "50%",
              background: "var(--accent)", animation: "pulse-soft 2s ease infinite",
            }} />
          )}
        </div>
        <span style={{ fontSize: "11.5px", color: "var(--text-ghost)", letterSpacing: "-0.01em" }}>{breadcrumb}</span>
      </div>

      {/* Tiptap editor */}
      <div className="flex-1 overflow-y-auto">
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 32px" }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <style>{`
        .tiptap-editor {
          outline: none;
          color: rgba(232, 236, 244, 0.85);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.8;
          caret-color: var(--accent);
        }
        .tiptap-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--text-ghost);
          pointer-events: none;
          float: left;
          height: 0;
        }
        .tiptap-editor h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 32px 0 16px;
          line-height: 1.3;
          letter-spacing: -0.03em;
          color: var(--text-primary);
        }
        .tiptap-editor h2 {
          font-size: 22px;
          font-weight: 600;
          margin: 28px 0 12px;
          line-height: 1.35;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }
        .tiptap-editor h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 24px 0 8px;
          line-height: 1.4;
          color: var(--text-primary);
        }
        .tiptap-editor p {
          margin: 0 0 12px;
        }
        .tiptap-editor ul, .tiptap-editor ol {
          padding-left: 24px;
          margin: 0 0 12px;
        }
        .tiptap-editor li {
          margin: 4px 0;
        }
        .tiptap-editor li p {
          margin: 0;
        }
        .tiptap-editor blockquote {
          border-left: 3px solid var(--accent);
          padding-left: 16px;
          margin: 16px 0;
          color: var(--text-secondary);
          font-style: italic;
        }
        .tiptap-editor code {
          background: rgba(255,255,255,0.06);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
          font-family: "SF Mono", "JetBrains Mono", Menlo, monospace;
          color: var(--accent);
        }
        .tiptap-editor pre {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--r3);
          padding: 16px;
          margin: 16px 0;
          overflow-x: auto;
        }
        .tiptap-editor pre code {
          background: none;
          padding: 0;
          color: var(--text-primary);
          font-size: 13px;
          line-height: 1.6;
        }
        .tiptap-editor hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 24px 0;
        }
        .tiptap-editor img {
          max-width: 100%;
          border-radius: var(--r3);
          margin: 16px 0;
        }
        .tiptap-editor strong {
          font-weight: 600;
          color: var(--text-primary);
        }
        .tiptap-editor a {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
