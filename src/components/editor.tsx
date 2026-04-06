import { useEffect, useRef, useCallback } from "react";
import { useNoteStore } from "../store/note-store";

export default function Editor() {
  const { selectedPath, content, isModified, updateContent, saveNote, createNote } =
    useNoteStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback(
    (value: string) => {
      updateContent(value);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveNote(), 1500);
    },
    [updateContent, saveNote],
  );

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

  useEffect(() => {
    if (selectedPath && textareaRef.current) textareaRef.current.focus();
  }, [selectedPath]);

  /* ── Empty state ── */
  if (!selectedPath) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: "var(--bg-base)" }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--s5)",
            animation: "fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Icon with gradient bg + subtle shadow */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "var(--r5)",
              background: "linear-gradient(135deg, rgba(107,138,253,0.12), rgba(107,138,253,0.04))",
              border: "1px solid rgba(107,138,253,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(107,138,253,0.06)",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              style={{ color: "var(--accent)" }}
            >
              <path
                d="M16 5C10.5 5 6 9.5 6 15c0 3.5 1.8 6.6 4.5 8.4V27a1.5 1.5 0 001.5 1.5h8A1.5 1.5 0 0021.5 27v-3.6C24.2 21.6 26 18.5 26 15c0-5.5-4.5-10-10-10z"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M13 30h6M14 16a2 2 0 014 0"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                opacity="0.4"
              />
            </svg>
          </div>

          {/* Text */}
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
            <span style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em" }}>
              Start capturing your thoughts
            </span>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              Select a note or create a new one
            </span>
          </div>

          {/* CTA */}
          <button
            className="empty-cta"
            onClick={() => {
              const name = prompt("Note name:");
              if (name) createNote(name.endsWith(".md") ? name : `${name}.md`);
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6.5 2v9M2 6.5h9" />
            </svg>
            Create new note
          </button>
        </div>

        <style>{`
          .empty-cta {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 22px;
            font-size: 13px;
            font-weight: 500;
            border-radius: var(--r3);
            border: none;
            background: var(--accent);
            color: #0c0e12;
            cursor: pointer;
            letter-spacing: -0.01em;
          }
          .empty-cta:hover {
            background: var(--accent-hover);
            transform: translateY(-1px);
            box-shadow: 0 6px 20px var(--accent-glow);
          }
          .empty-cta:active {
            transform: scale(0.98);
            box-shadow: none;
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
        style={{
          height: "48px",
          padding: "0 var(--s6)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center" style={{ gap: "var(--s3)" }}>
          <span style={{ fontSize: "13px", fontWeight: 500 }}>{fileName}</span>
          {isModified && (
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "var(--accent)",
                animation: "pulse-soft 2s ease infinite",
              }}
            />
          )}
        </div>
        <span style={{ fontSize: "12px", color: "var(--text-ghost)" }}>
          {breadcrumb}
        </span>
      </div>

      {/* Editor — centered */}
      <div className="flex-1 overflow-y-auto">
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "var(--s6) var(--s7)" }}>
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent outline-none resize-none"
            style={{
              color: "var(--text-primary)",
              fontSize: "14px",
              lineHeight: "1.8",
              fontFamily: '"SF Mono", "JetBrains Mono", "Fira Code", Menlo, monospace',
              minHeight: "calc(100vh - 140px)",
              caretColor: "var(--accent)",
              letterSpacing: "0",
            }}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Start writing..."
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
