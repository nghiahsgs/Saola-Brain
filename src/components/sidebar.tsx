import { useEffect, useState } from "react";
import { useNoteStore, NoteEntry } from "../store/note-store";

function TreeNode({ entry, depth }: { entry: NoteEntry; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const { selectedPath, selectNote, deleteNote } = useNoteStore();
  const isSelected = selectedPath === entry.path;

  if (entry.is_dir) {
    return (
      <div>
        <div
          className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-[var(--hover-bg)] rounded text-sm"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-xs opacity-60">{expanded ? "▼" : "▶"}</span>
          <span className="opacity-80">📁</span>
          <span className="text-[var(--text-secondary)] truncate">{entry.name}</span>
        </div>
        {expanded && entry.children?.map((child) => (
          <TreeNode key={child.path} entry={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded text-sm group ${
        isSelected ? "bg-[var(--selected-bg)]" : "hover:bg-[var(--hover-bg)]"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={() => selectNote(entry.path)}
    >
      <span className="opacity-60">📄</span>
      <span className="truncate flex-1">{entry.name.replace(".md", "")}</span>
      <button
        className="opacity-0 group-hover:opacity-60 hover:opacity-100 text-xs text-red-400"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Delete "${entry.name}"?`)) {
            deleteNote(entry.path);
          }
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default function Sidebar() {
  const { tree, loadTree, createNote, createFolder } = useNoteStore();
  const [newName, setNewName] = useState("");
  const [showInput, setShowInput] = useState<"note" | "folder" | null>(null);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    if (showInput === "note") {
      const path = newName.endsWith(".md") ? newName : `${newName}.md`;
      createNote(path);
    } else if (showInput === "folder") {
      createFolder(newName);
    }
    setNewName("");
    setShowInput(null);
  };

  return (
    <div className="w-64 min-w-48 bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
        <h1 className="text-sm font-semibold text-[var(--accent)]">Saola Brain</h1>
        <div className="flex gap-1">
          <button
            className="text-xs px-1.5 py-0.5 rounded hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]"
            onClick={() => setShowInput(showInput === "note" ? null : "note")}
            title="New note"
          >
            + 📄
          </button>
          <button
            className="text-xs px-1.5 py-0.5 rounded hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]"
            onClick={() => setShowInput(showInput === "folder" ? null : "folder")}
            title="New folder"
          >
            + 📁
          </button>
        </div>
      </div>

      {/* New item input */}
      {showInput && (
        <div className="p-2 border-b border-[var(--border)]">
          <input
            className="w-full bg-[var(--editor-bg)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            placeholder={showInput === "note" ? "note-name.md" : "folder-name"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] p-4 text-center">
            No notes yet. Create one!
          </p>
        ) : (
          tree.map((entry) => (
            <TreeNode key={entry.path} entry={entry} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}
