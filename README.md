# Knowledge Page — template

A self-contained, interactive single-page explainer. No build step, no dependencies to install
— just three files you open in a browser. Made for sharing a concept with your team.

## Files

- `index.html` — the page. Every editable spot is flagged `✏️ EDIT`.
- `styles.css` — all styling. Theme via the variables at the very top.
- `script.js` — interactivity (diagrams, code tabs, swap demo, quiz). Data lives in arrays here.

## Use it (no tools needed)

1. Open `index.html` in any modern browser — it works straight from disk (`file://`).
2. Edit the `✏️ EDIT` placeholders in `index.html` with your content.
3. Rebrand: change the `--accent-a` / `--accent-b` colors at the top of `styles.css`.
4. Edit the data arrays in `script.js`:
   - `diagrams` — the node-graph diagrams
   - `swapSnippets` + the `#coreCode` block — the code-swap demo
   - `LANGS` — the multi-language code tabs
   - quiz answers are in `index.html` (`data-score="a"|"b"`)
5. Using extra code languages? Add their ids to the Shiki `langs:` array in `index.html`.
6. **Two languages (EN/TH):** static text is twin spans —
   `<span lang="en">…</span><span lang="th">…</span>` (edit both); dynamic strings in
   `script.js` use `{en, th}` objects. To make the page one language, delete the `🌐` button,
   the inline `data-lang` script, and the i18n CSS block, then write text directly.

## Features

- 🌗 Dark / light toggle (remembers your choice)
- ✨ Reveal-on-scroll, ambient background, scroll progress bar
- 🔷 Interactive SVG diagrams with a "play flow" animation
- 💻 Syntax-highlighted code (Shiki, loaded from CDN) + a live code-swap demo
- 📊 Comparison table + decision quiz
- 🖨️ "PDF" button → print to a clean, paginated PDF
- 🌐 Bilingual EN / TH toggle (remembers your choice)
- 📱 Responsive; Thai + English fonts included

## Sharing

It's just static files. Share by:
- zipping the folder, or
- dropping it on any static host (GitHub Pages, Netlify, an internal file server), or
- opening `index.html` locally and using the **PDF** button to export a handout.

## Notes

- Syntax highlighting needs internet on first load (Shiki CDN). Offline, code still shows as
  plain monospace.
- Every section is independent — delete any block's HTML and the page keeps working.

Generated from the `knowledge-page` skill.
