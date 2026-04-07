import { useEffect, useState, useRef } from "react";
import { useNoteStore, NoteEntry } from "../store/note-store";

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
  const leftPad = depth * 16 + 12;

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
          <span className="flex-1" style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            {entry.name}
          </span>
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
      style={{ paddingLeft: `${leftPad + 16}px` }}
      onClick={() => selectNote(entry.path)}
      onContextMenu={(e) => onContextMenu(e, entry)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", entry.path);
        e.dataTransfer.effectAllowed = "move";
      }}
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
    </button>
  );
}

export default function Sidebar() {
  const { tree, loadTree, startPolling, createNote, createFolder, deleteNote, renameNote } =
    useNoteStore();
  const [newName, setNewName] = useState("");
  const [showInput, setShowInput] = useState<"note" | "folder" | null>(null);
  const [inputPrefix, setInputPrefix] = useState("");
  const [ctxMenu, setCtxMenu] = useState<ContextMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTree();
    startPolling();
  }, []);

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
            <div style={{ fontSize: "11px", color: "var(--text-ghost)", marginBottom: "4px", paddingLeft: "2px" }}>
              in {inputPrefix}/
            </div>
          )}
          <input
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
          gap: 8px;
          width: 100%;
          padding: 5px 10px;
          border: none;
          border-radius: var(--r2);
          background: transparent;
          cursor: pointer;
          position: relative;
          text-align: left;
          transition: background 0.12s ease;
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
        .sidebar-item[data-dragover] {
          background: var(--accent-muted);
          outline: 1px dashed var(--accent);
          outline-offset: -1px;
        }
        .sidebar-item[draggable]:active {
          opacity: 0.5;
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

        /* Context menu */
        .ctx-menu {
          position: fixed;
          z-index: 100;
          min-width: 160px;
          padding: 4px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--r3);
          box-shadow: 0 8px 30px rgba(0,0,0,0.5);
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
