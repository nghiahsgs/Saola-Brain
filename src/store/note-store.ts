import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface NoteEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: NoteEntry[];
}

interface NoteStore {
  tree: NoteEntry[];
  selectedPath: string | null;
  content: string;
  httpPort: number | null;
  assetsDir: string | null;
  isModified: boolean;

  loadTree: () => Promise<void>;
  selectNote: (path: string) => void;
  updateContent: (content: string) => void;
  saveNote: () => Promise<void>;
  createNote: (path: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  deleteNote: (path: string) => Promise<void>;
  renameNote: (oldPath: string, newPath: string) => Promise<void>;
  loadHttpPort: () => Promise<void>;
  loadAssetsDir: () => Promise<void>;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  tree: [],
  selectedPath: null,
  content: "",
  httpPort: null,
  assetsDir: null,
  isModified: false,

  loadTree: async () => {
    const tree = await invoke<NoteEntry[]>("notes_list");
    set({ tree });
  },

  selectNote: (path: string) => {
    // Save current note in background if modified (non-blocking)
    const { isModified, selectedPath } = get();
    if (isModified && selectedPath) {
      invoke("notes_write", { path: selectedPath, content: get().content });
    }

    // Set path immediately for instant UI response
    set({ selectedPath: path, content: "", isModified: false });

    // Load content async
    invoke<string>("notes_read", { path }).then((content) => {
      // Only update if still on the same note
      if (get().selectedPath === path) {
        set({ content });
      }
    });
  },

  updateContent: (content: string) => {
    set({ content, isModified: true });
  },

  saveNote: async () => {
    const { selectedPath, content } = get();
    if (!selectedPath) return;
    await invoke("notes_write", { path: selectedPath, content });
    set({ isModified: false });
  },

  createNote: async (path: string) => {
    await invoke("notes_write", { path, content: "" });
    await get().loadTree();
    get().selectNote(path);
  },

  createFolder: async (path: string) => {
    await invoke("notes_create_folder", { path });
    await get().loadTree();
  },

  deleteNote: async (path: string) => {
    await invoke("notes_delete", { path });
    const { selectedPath } = get();
    if (selectedPath === path) {
      set({ selectedPath: null, content: "", isModified: false });
    }
    await get().loadTree();
  },

  renameNote: async (oldPath: string, newPath: string) => {
    await invoke("notes_rename", { oldPath, newPath });
    const { selectedPath } = get();
    if (selectedPath === oldPath) {
      set({ selectedPath: newPath });
    }
    await get().loadTree();
  },

  loadHttpPort: async () => {
    const port = await invoke<number>("http_server_port");
    set({ httpPort: port });
  },

  loadAssetsDir: async () => {
    const dir = await invoke<string>("notes_assets_dir");
    set({ assetsDir: dir });
  },
}));
