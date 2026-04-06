import { useEffect, useRef, useCallback } from "react";
import { useNoteStore } from "../store/note-store";

export default function Editor() {
  const { selectedPath, content, isModified, updateContent, saveNote } = useNoteStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save with debounce
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback(
    (value: string) => {
      updateContent(value);

      // Debounced auto-save (1.5s after last keystroke)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveNote();
      }, 1500);
    },
    [updateContent, saveNote],
  );

  // Cmd+S manual save
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

  // Focus textarea when note changes
  useEffect(() => {
    if (selectedPath && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selectedPath]);

  if (!selectedPath) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
        <div className="text-center">
          <p className="text-4xl mb-4 opacity-20">🧠</p>
          <p className="text-sm">Select a note or create a new one</p>
        </div>
      </div>
    );
  }

  const fileName = selectedPath.split("/").pop()?.replace(".md", "") || selectedPath;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Title bar */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{fileName}</span>
          {isModified && (
            <span className="text-xs text-[var(--text-secondary)] opacity-60">● unsaved</span>
          )}
        </div>
        <span className="text-xs text-[var(--text-secondary)]">{selectedPath}</span>
      </div>

      {/* Editor area */}
      <textarea
        ref={textareaRef}
        className="flex-1 w-full bg-transparent p-4 text-sm leading-relaxed text-[var(--text-primary)] outline-none resize-none font-mono"
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start writing..."
        spellCheck={false}
      />
    </div>
  );
}
