import { useEffect } from "react";
import { useNoteStore } from "../store/note-store";

export default function Toolbar() {
  const { httpPort, loadHttpPort } = useNoteStore();

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
  };

  return (
    <div className="h-8 bg-[var(--sidebar-bg)] border-t border-[var(--border)] flex items-center justify-between px-3">
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        {httpPort && (
          <span className="opacity-60">API: 127.0.0.1:{httpPort}</span>
        )}
      </div>

      <button
        className="text-xs px-3 py-1 rounded bg-[var(--accent)] text-[var(--sidebar-bg)] font-medium hover:bg-[var(--accent-hover)] transition-colors"
        onClick={copyPrompt}
        title="Copy AI prompt with API endpoints"
      >
        Copy Prompt
      </button>
    </div>
  );
}
