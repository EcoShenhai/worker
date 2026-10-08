# Worker User Guide: single source

`user-guide.md` is the **only** file to edit. Everything else is generated from it:

- **In the app:** a copy is served at `/docs/user-guide.md` and shown at **/guide** (public, no sign-in). The page is `frontend/src/guide/UserGuide.jsx`, wired into the router in `frontend/src/App.jsx`.
- **Word version:** `Worker_User_Guide.docx`, built by `build-docx.js`, for emailing to users directly.

This user guide replaces the earlier `worker-walkthrough.pdf`.

Supported Markdown: `#` section, `##` subsection, paragraphs, `-` and `1.` lists, tables, `**bold**`, `*italic*`, links, and `>` for a highlighted note.

## After editing the guide (run from the repository root)

```bash
cp docs/user-guide/user-guide.md frontend/public/docs/user-guide.md
NODE_PATH=/srv/apps/ecooffice/node_modules node docs/user-guide/build-docx.js docs/user-guide/user-guide.md frontend/public/docs/Worker_User_Guide.docx
npm --prefix frontend run build
```

(The `docx` builder dependency is shared from the EcoOffice repo on this host, hence `NODE_PATH`.) Sections can be linked directly, e.g. `/guide#8-generate-any-document-from-a-session` (useful for ShenPort campaigns).
