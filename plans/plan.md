# Saola Brain — Implementation Plan

## Overview
AI-native note app. Markdown notes with folder tree + HTTP API for AI interaction + Copy Prompt workflow + Vector search.

**Stack:** Tauri 2 (Rust) + React 19 + TypeScript + Tailwind CSS 4 + SQLite (via Tauri plugin)

## Architecture

```
┌─────────────────────────────────────────┐
│  Tauri App (Saola Brain)                │
├──────────────┬──────────────────────────┤
│  React UI    │  Rust Backend            │
│  - Sidebar   │  - File system ops       │
│  - Editor    │  - SQLite (notes + vec)  │
│  - Search    │  - HTTP server (actix)   │
│              │  - Embed service         │
├──────────────┴──────────────────────────┤
│  Storage: ~/SaolaBrain/                 │
│  ├── notes/ (markdown files)            │
│  ├── brain.db (SQLite + vectors)        │
│  └── config.json                        │
└─────────────────────────────────────────┘
```

## Phases

### Phase 1: Project Setup ✅ → [ ]
- Init Tauri 2 + React + TypeScript + Tailwind
- Project structure
- Basic window

### Phase 2: Note CRUD + Folder Tree → [ ]
- Sidebar with folder/file tree
- Create/rename/delete notes and folders
- Markdown editor (Tiptap or CodeMirror)
- Auto-save
- Storage: ~/SaolaBrain/notes/ as .md files

### Phase 3: HTTP API → [ ]
- Local HTTP server (Rust actix-web or tiny_http)
- Endpoints:
  - GET /notes — list all notes
  - GET /notes/:path — read note content
  - POST /notes — create note
  - PUT /notes/:path — update note
  - DELETE /notes/:path — delete note
  - GET /search?q= — full-text search
- localhost only (127.0.0.1)

### Phase 4: Copy Prompt → [ ]
- "Copy Prompt" button in toolbar
- Generates prompt with API URL + available endpoints
- Customizable prompt template

### Phase 5: Vector Search (v2) → [ ]
- SQLite-vec for vector storage
- Embed on save (configurable: OpenAI / Ollama)
- GET /search/semantic?q= endpoint
- Smart search UI in app

## Success Criteria
- [ ] Can create/edit/delete notes with folders
- [ ] Can copy prompt and paste into Claude Code to read/write notes
- [ ] Search works (full-text, and later semantic)
- [ ] App is fast and lightweight (<50MB)
