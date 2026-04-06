import { useEffect, useState } from "react";
import { useNoteStore } from "../store/note-store";

export default function Toolbar() {
  const { httpPort, loadHttpPort } = useNoteStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadHttpPort();
  }, [loadHttpPort]);

  const copyPrompt = () => {
    if (!httpPort) return;

    const prompt = `You can interact with my notes via a local HTTP API at http://127.0.0.1:${httpPort}.

Available endpoints:
- GET  /notes              — List all notes (flat list with path, name, is_dir)
- GET  /notes/<path>       — Read a note's content (returns {path, content})
- POST /notes              — Create a note (body: {path: "folder/name.md", content: "..."})
- PUT  /notes/<path>       — Update a note (body: {content: "..."})
- DELETE /notes/<path>     — Delete a note or folder
- GET  /search?q=<keyword> — Full-text search across all notes

Examples:
  curl http://127.0.0.1:${httpPort}/notes
  curl http://127.0.0.1:${httpPort}/notes/research/ai-tools.md
  curl -X POST http://127.0.0.1:${httpPort}/notes -H "Content-Type: application/json" -d '{"path":"research/new-topic.md","content":"# New Topic\\n\\nNotes here..."}'
  curl http://127.0.0.1:${httpPort}/search?q=machine+learning

All notes are stored as markdown files. Use folders to organize topics.`;

    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="flex items-center justify-between shrink-0"
      style={{
        height: "34px",
        padding: "0 var(--s4)",
        background: "var(--bg-sidebar)",
        borderTop: "1px solid var(--border)",
      }}
    >
      {/* Status */}
      <div className="flex items-center" style={{ gap: "var(--s2)" }}>
        {httpPort && (
          <>
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "var(--green)",
                boxShadow: "0 0 6px rgba(52,211,153,0.4)",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-ghost)",
                fontFamily: "monospace",
                letterSpacing: "0.02em",
              }}
            >
              :{httpPort}
            </span>
          </>
        )}
      </div>

      {/* Copy prompt */}
      <button
        className="toolbar-btn"
        data-copied={copied || undefined}
        onClick={copyPrompt}
        title="Copy AI prompt with API endpoints"
      >
        {copied ? (
          <>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 5.5L4.5 8L9 3" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.1">
              <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
              <path d="M7.5 3.5V2a.75.75 0 00-.75-.75H2A.75.75 0 001.25 2v4.75A.75.75 0 002 7.5h1.5" />
            </svg>
            Copy Prompt
          </>
        )}
      </button>

      <style>{`
        .toolbar-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 500;
          border-radius: var(--r1);
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          cursor: pointer;
          letter-spacing: 0;
        }
        .toolbar-btn:hover {
          background: var(--hover);
          color: var(--text-secondary);
        }
        .toolbar-btn[data-copied] {
          color: var(--green);
        }
      `}</style>
    </div>
  );
}
