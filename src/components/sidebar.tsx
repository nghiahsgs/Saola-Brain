import { useEffect, useState, useRef } from "react";
import { useNoteStore, NoteEntry } from "../store/note-store";

/* ── Icons ── */
const FolderIcon = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    {open ? (
      <path
        d="M1.75 4.5V3a1 1 0 011-1h3l1.25 1.25h4.25a1 1 0 011 1V4.5M2.25 4.5h9.5a1 1 0 011 1v4.75a1 1 0 01-1 1H2.25a1 1 0 01-1-1V5.5a1 1 0 011-1z"
        stroke="var(--accent)" strokeWidth="1" fill="rgba(124,140,245,0.08)"
      />
    ) : (
      <path
        d="M1.75 4V3a1 1 0 011-1h3l1.25 1.25h4.25a1 1 0 011 1v5a1 1 0 01-1 1h-8.5a1 1 0 01-1-1V4z"
        stroke="var(--text-tertiary)" strokeWidth="1" fill="none"
      />
    )}
  </svg>
);

const NoteIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2" y="1.5" width="9" height="10" rx="1.5" stroke="var(--text-ghost)" strokeWidth="0.9" />
    <path d="M4.5 5h4M4.5 7h2.5" stroke="var(--text-ghost)" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
  </svg>
);

/* ── Context menu state ── */
interface ContextMenu {
  x: number;
  y: number;
  entry: NoteEntry;
}

function TreeNode({
  entry,
  depth,
  onContextMenu,
  onDrop,
  onCreateInFolder,
}: {
  entry: NoteEntry;
  depth: number;
  onContextMenu: (e: React.MouseEvent, entry: NoteEntry) => void;
  onDrop: (notePath: string, folderPath: string) => void;
  onCreateInFolder: (folderPath: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const { selectedPath, selectNote } = useNoteStore();
  const isSelected = selectedPath === entry.path;
  const leftPad = depth * 18 + 10;

  if (entry.is_dir) {
    return (
      <div>
        <button
          className="sidebar-item"
          data-dragover={dragOver || undefined}
          style={{ paddingLeft: `${leftPad}px` }}
          onClick={() => setExpanded(!expanded)}
          onContextMenu={(e) => onContextMenu(e, entry)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const notePath = e.dataTransfer.getData("text/plain");
            if (notePath) onDrop(notePath, entry.path);
          }}
        >
          <svg
            width="7"
            height="7"
            viewBox="0 0 7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            style={{
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
              opacity: 0.3,
              flexShrink: 0,
            }}
          >
            <path d="M2 1L5 3.5L2 6" />
          </svg>
          <FolderIcon open={expanded} />
          <span className="sidebar-folder-name">{entry.name}</span>
          <span
            className="folder-add-btn"
            onClick={(e) => {
              e.stopPropagation();
              onCreateInFolder(entry.path);
            }}
            title="New note in this folder"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M5 2v6M2 5h6" />
            </svg>
          </span>
        </button>
        {expanded &&
          entry.children?.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              onContextMenu={onContextMenu}
              onDrop={onDrop}
              onCreateInFolder={onCreateInFolder}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      className="sidebar-item group"
      data-active={isSelected || undefined}
      style={{ paddingLeft: `${leftPad + 20}px` }}
      onMouseDown={(e) => {
        // Use mousedown for immediate response — onClick gets swallowed by draggable
        if (e.button === 0) selectNote(entry.path);
      }}
      onContextMenu={(e) => onContextMenu(e, entry)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", entry.path);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <NoteIcon />
      <span className="sidebar-note-name" data-active={isSelected || undefined}>
        {entry.name.replace(".md", "")}
      </span>
    </button>
  );
}

export default function Sidebar() {
  const { tree, loadTree, createNote, createFolder, deleteNote, renameNote, showCreateInput, setShowCreateInput } =
    useNoteStore();
  const [newName, setNewName] = useState("");
  const [showInput, setShowInput] = useState<"note" | "folder" | null>(null);
  const [inputPrefix, setInputPrefix] = useState("");
  const [ctxMenu, setCtxMenu] = useState<ContextMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTree();
    const onFocus = () => loadTree();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Respond to "Create new note" triggered from editor empty state
  useEffect(() => {
    if (showCreateInput) {
      setInputPrefix("");
      setShowInput("note");
      setShowCreateInput(false);
    }
  }, [showCreateInput]);

  // Auto-focus input when it appears
  useEffect(() => {
    if (showInput) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showInput]);

  // Close context menu on click outside
  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, entry: NoteEntry) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, entry });
  };

  const handleDrop = (notePath: string, folderPath: string) => {
    const fileName = notePath.split("/").pop() || notePath;
    const newPath = `${folderPath}/${fileName}`;
    if (newPath !== notePath) {
      renameNote(notePath, newPath);
    }
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const prefix = inputPrefix ? `${inputPrefix}/` : "";
    if (showInput === "note") {
      const path = newName.endsWith(".md") ? newName : `${newName}.md`;
      createNote(`${prefix}${path}`);
    } else if (showInput === "folder") {
      createFolder(`${prefix}${newName}`);
    }
    setNewName("");
    setShowInput(null);
    setInputPrefix("");
  };

  const startCreateInFolder = (folderPath: string, type: "note" | "folder") => {
    setInputPrefix(folderPath);
    setShowInput(type);
    setCtxMenu(null);
  };

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{
        width: "260px",
        minWidth: "200px",
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          height: "50px",
          padding: "0 var(--s4) 0 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Saola Brain
        </span>
        <button
          className="icon-btn"
          onClick={() => {
            setInputPrefix("");
            setShowInput(showInput === "note" ? null : "note");
          }}
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
          {inputPrefix && (
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "4px", paddingLeft: "2px" }}>
              in {inputPrefix}/
            </div>
          )}
          <input
            ref={inputRef}
            className="sidebar-input"
            placeholder={showInput === "note" ? "Note name..." : "Folder name..."}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setShowInput(null);
                setInputPrefix("");
              }
            }}
            autoFocus
          />
        </div>
      )}

      {/* Section label */}
      <div style={{ padding: "var(--s4) 20px var(--s2)" }}>
        <div className="flex items-center justify-between">
          <span className="sidebar-section-label">Notes</span>
          <button
            className="icon-btn-sm"
            onClick={() => {
              setInputPrefix("");
              setShowInput(showInput === "folder" ? null : "folder");
            }}
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
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              onContextMenu={handleContextMenu}
              onDrop={handleDrop}
              onCreateInFolder={(folderPath) => startCreateInFolder(folderPath, "note")}
            />
          ))
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          ref={menuRef}
          className="ctx-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {ctxMenu.entry.is_dir && (
            <>
              <button
                className="ctx-item"
                onClick={() => startCreateInFolder(ctxMenu.entry.path, "note")}
              >
                New note here
              </button>
              <button
                className="ctx-item"
                onClick={() => startCreateInFolder(ctxMenu.entry.path, "folder")}
              >
                New folder here
              </button>
              <div className="ctx-divider" />
            </>
          )}
          <button
            className="ctx-item"
            onClick={() => {
              const name = prompt("Rename to:", ctxMenu.entry.name);
              if (name && name !== ctxMenu.entry.name) {
                const parent = ctxMenu.entry.path.includes("/")
                  ? ctxMenu.entry.path.substring(0, ctxMenu.entry.path.lastIndexOf("/"))
                  : "";
                const newPath = parent ? `${parent}/${name}` : name;
                renameNote(ctxMenu.entry.path, newPath);
              }
              setCtxMenu(null);
            }}
          >
            Rename
          </button>
          <button
            className="ctx-item ctx-danger"
            onClick={() => {
              if (confirm(`Delete "${ctxMenu.entry.name}"?`)) {
                deleteNote(ctxMenu.entry.path);
              }
              setCtxMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}

      <style>{`
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 7px;
          width: 100%;
          padding: 5px 10px;
          border: none;
          border-radius: var(--r2);
          background: transparent;
          cursor: pointer;
          position: relative;
          text-align: left;
          transition: background 0.12s ease, transform 0.1s ease;
        }
        .sidebar-item:hover {
          background: var(--hover);
        }
        .sidebar-item:active {
          transform: scale(0.985);
        }
        .sidebar-item[data-active] {
          background: var(--active);
        }
        .sidebar-item[data-active]::before {
          content: "";
          position: absolute;
          left: 0;
          top: 5px;
          bottom: 5px;
          width: 2.5px;
          border-radius: 2px;
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent-glow);
        }
        .sidebar-item[data-dragover] {
          background: var(--accent-muted);
          outline: 1px dashed var(--accent);
          outline-offset: -1px;
        }
        .sidebar-item[draggable]:active {
          opacity: 0.5;
        }

        .sidebar-folder-name {
          flex: 1;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: -0.01em;
        }
        .sidebar-item:hover .sidebar-folder-name {
          color: var(--text-primary);
        }

        .sidebar-note-name {
          flex: 1;
          font-size: 12.5px;
          font-weight: 400;
          color: var(--text-tertiary);
          letter-spacing: -0.01em;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sidebar-note-name[data-active] {
          color: var(--text-primary);
          font-weight: 500;
        }
        .sidebar-item:hover .sidebar-note-name {
          color: var(--text-secondary);
        }
        .sidebar-item[data-active]:hover .sidebar-note-name {
          color: var(--text-primary);
        }

        .sidebar-section-label {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-ghost);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .folder-add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: var(--r1);
          opacity: 0;
          color: var(--text-tertiary);
          flex-shrink: 0;
          cursor: pointer;
          transition: opacity 0.12s ease;
        }
        .sidebar-item:hover .folder-add-btn {
          opacity: 1;
        }
        .folder-add-btn:hover {
          background: var(--hover);
          color: var(--text-primary);
        }

        .icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--r2);
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          cursor: pointer;
        }
        .icon-btn:hover {
          background: var(--hover);
          color: var(--text-primary);
        }
        .icon-btn:active {
          transform: scale(0.92);
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
          padding: 7px 10px;
          font-size: 13px;
          border-radius: var(--r2);
          border: 1px solid var(--border-focus);
          background: var(--bg-surface);
          color: var(--text-primary);
          outline: none;
          box-shadow: 0 0 0 3px rgba(124, 140, 245, 0.08);
        }
        .sidebar-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(124, 140, 245, 0.15);
        }
        .sidebar-input::placeholder {
          color: var(--text-ghost);
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

        /* Context menu */
        .ctx-menu {
          position: fixed;
          z-index: 100;
          min-width: 160px;
          padding: 4px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--r3);
          box-shadow: 0 8px 30px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.05);
          animation: fadeInUp 0.1s ease;
        }
        .ctx-item {
          display: block;
          width: 100%;
          padding: 6px 10px;
          font-size: 12px;
          color: var(--text-secondary);
          background: none;
          border: none;
          border-radius: var(--r1);
          cursor: pointer;
          text-align: left;
        }
        .ctx-item:hover {
          background: var(--hover);
          color: var(--text-primary);
        }
        .ctx-danger:hover {
          background: rgba(248,113,113,0.1);
          color: var(--red);
        }
        .ctx-divider {
          height: 1px;
          margin: 4px 0;
          background: var(--border);
        }
      `}</style>
    </div>
  );
}
