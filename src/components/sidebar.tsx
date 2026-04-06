import { useEffect, useState } from "react";
import { useNoteStore, NoteEntry } from "../store/note-store";

function TreeNode({ entry, depth }: { entry: NoteEntry; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const { selectedPath, selectNote, deleteNote } = useNoteStore();
  const isSelected = selectedPath === entry.path;
  const leftPad = depth * 14 + 12;

  if (entry.is_dir) {
    return (
      <div>
        <button
          className="sidebar-item"
          style={{ paddingLeft: `${leftPad}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            style={{
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
              opacity: 0.35,
              flexShrink: 0,
            }}
          >
            <path d="M2.5 1L5.5 4L2.5 7" />
          </svg>
          <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            {entry.name}
          </span>
        </button>
        {expanded &&
          entry.children?.map((child) => (
            <TreeNode key={child.path} entry={child} depth={depth + 1} />
          ))}
      </div>
    );
  }

  return (
    <button
      className="sidebar-item group"
      data-active={isSelected || undefined}
      style={{ paddingLeft: `${leftPad + 16}px` }}
      onClick={() => selectNote(entry.path)}
    >
      <span
        className="truncate flex-1 text-left"
        style={{
          fontSize: "13px",
          fontWeight: isSelected ? 500 : 400,
          color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
        }}
      >
        {entry.name.replace(".md", "")}
      </span>
      <span
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Delete "${entry.name}"?`)) deleteNote(entry.path);
        }}
      >
        ×
      </span>

      <style>{`
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 5px 10px;
          border: none;
          border-radius: var(--r2);
          background: transparent;
          cursor: pointer;
          position: relative;
          text-align: left;
        }
        .sidebar-item:hover {
          background: var(--hover);
        }
        .sidebar-item[data-active] {
          background: var(--active);
        }
        .sidebar-item[data-active]::before {
          content: "";
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 2px;
          border-radius: 2px;
          background: var(--accent);
        }
        .delete-btn {
          opacity: 0;
          font-size: 14px;
          color: var(--text-tertiary);
          flex-shrink: 0;
          line-height: 1;
          padding: 0 2px;
        }
        .sidebar-item:hover .delete-btn {
          opacity: 1;
        }
        .delete-btn:hover {
          color: var(--red) !important;
        }
      `}</style>
    </button>
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
      createNote(newName.endsWith(".md") ? newName : `${newName}.md`);
    } else {
      createFolder(newName);
    }
    setNewName("");
    setShowInput(null);
  };

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{
        width: "256px",
        minWidth: "200px",
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          height: "48px",
          padding: "0 var(--s4) 0 var(--s5)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "-0.02em" }}>
          Saola Brain
        </span>
        <button
          className="icon-btn"
          onClick={() => setShowInput(showInput === "note" ? null : "note")}
          title="New note"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M7 2.5v9M2.5 7h9" />
          </svg>
        </button>
      </div>

      {/* Input */}
      {showInput && (
        <div style={{ padding: "var(--s2) var(--s3)" }}>
          <input
            className="sidebar-input"
            placeholder={showInput === "note" ? "Note name..." : "Folder name..."}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setShowInput(null);
            }}
            autoFocus
          />
        </div>
      )}

      {/* Section */}
      <div style={{ padding: "var(--s4) var(--s5) var(--s2)" }}>
        <div className="flex items-center justify-between">
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--text-ghost)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Notes
          </span>
          <button
            className="icon-btn-sm"
            onClick={() => setShowInput(showInput === "folder" ? null : "folder")}
            title="New folder"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <path d="M1.5 3.5h3.5l1 1H10.5v5h-9z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "0 var(--s2) var(--s4)" }}>
        {tree.length === 0 ? (
          <div
            className="flex flex-col items-center text-center"
            style={{
              padding: "var(--s7) var(--s5) var(--s5)",
              gap: "var(--s4)",
              animation: "fadeInUp 0.3s ease",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              style={{ color: "var(--text-ghost)" }}
            >
              <rect x="5" y="3" width="18" height="22" rx="2.5" />
              <path d="M9 10h10M9 14h6" opacity="0.4" />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s1)" }}>
              <span style={{ fontSize: "13px", color: "var(--text-tertiary)", fontWeight: 500 }}>
                No notes yet
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-ghost)" }}>
                Create your first note
              </span>
            </div>
            <button
              className="sidebar-cta"
              onClick={() => setShowInput("note")}
            >
              New note
            </button>
          </div>
        ) : (
          tree.map((entry) => (
            <TreeNode key={entry.path} entry={entry} depth={0} />
          ))
        )}
      </div>

      <style>{`
        .icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--r2);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .icon-btn:hover {
          background: var(--hover);
          color: var(--text-primary);
        }
        .icon-btn-sm {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: var(--r1);
          border: none;
          background: transparent;
          color: var(--text-ghost);
          cursor: pointer;
        }
        .icon-btn-sm:hover {
          background: var(--hover);
          color: var(--text-secondary);
        }
        .sidebar-input {
          width: 100%;
          padding: 6px 10px;
          font-size: 13px;
          border-radius: var(--r2);
          border: 1px solid var(--border);
          background: var(--bg-base);
          color: var(--text-primary);
          outline: none;
        }
        .sidebar-input:focus {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 2px rgba(107, 138, 253, 0.12);
        }
        .sidebar-cta {
          padding: 5px 14px;
          font-size: 12px;
          font-weight: 500;
          border-radius: var(--r2);
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .sidebar-cta:hover {
          background: var(--hover);
          color: var(--text-primary);
          border-color: rgba(255,255,255,0.08);
        }
      `}</style>
    </div>
  );
}
