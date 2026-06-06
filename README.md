<h1 align="center">NoteManagerPy</h1>

<p align="center">
  <b>Offline plain-text note manager</b> with <b>tags</b>, <b>search</b>, and a <b>slick web UI</b>
  <br>
  <sub>A Python rewrite of <a href="https://github.com/bishwaruppaul/NoteManageR">NoteManageR</a> by Bishwarup Paul</sub>
</p>

<p align="center">
  <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.8+-blue?logo=python&logoColor=white" alt="Python 3.8+"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-GPLv3-green" alt="License GPLv3"></a>
  <a href="./dist/NoteManagerPy.exe"><img src="https://img.shields.io/badge/download-12.3_MB-blueviolet?logo=windows" alt="Download"></a>
  <a href="https://github.com/bishwaruppaul/NoteManageR"><img src="https://img.shields.io/badge/original-R_script-276DC3?logo=r&logoColor=white" alt="Original R Script"></a>
</p>

<br>

# Download

| Platform | File | Action |
|----------|------|--------|
| **Windows 10 / 11** | [`NoteManagerPy.exe`](./dist/NoteManagerPy.exe) (12.3 MB) | Download & double-click to run |

**No Python or installation required.** The `.exe` is fully self-contained — it bundles Python, Flask, and everything else. Just run it and your browser opens to the app.

<br>

---

<br>

# Features

| | |
|---|---|
| 🏷️ **Tag-based organization** | Add tags to notes, filter by tag, or browse all |
| 🔍 **Full-text search** | Instantly search note titles and tags |
| ✍️ **Markdown support** | Write in Markdown, toggle to preview rendered output |
| 📝 **Inline editor** | Create and edit notes directly in the browser |
| 💾 **Auto-save** | Changes saved automatically as you type (no manual save needed) |
| 📂 **Plain text files** | Notes are standard `.txt` files — yours forever, no lock-in |
| 🚀 **Portable** | Single `.exe`, runs anywhere, carries your `notes/` folder with it |
| 🔄 **Backward compatible** | Reads the same `Tags:` / `Created:` file format as the original R version |

<br>

---

<br>

# Why This Exists

Inspired by great blogs by [Derek Sivers](https://sive.rs/plaintext) and [Szymon Krajewski](https://szymonkrajewski.pl/taking-notes-in-plaintext/), the original [NoteManageR](https://github.com/bishwaruppaul/NoteManageR) was built in R — a wonderful language for data analysis but not ideal for portable desktop tools.

**NoteManagerPy** is a full rewrite in Python that:
- Replaces the CLI with a **slick three-panel web UI** (tags sidebar, note list, inline editor)
- Adds **Markdown rendering**, **auto-save**, and **tag autocomplete**
- Packages everything into a **single portable `.exe`** — no R, no Python, no setup
- Keeps **full backward compatibility** with existing notes from the original

Note management is done via **tags**. When creating a note, you can add tags that make it easy to find later. Timestamps are added automatically in `DD Mon YYYY, HH:MM AM/PM` format.

<br>

---

<br>

# Quick Start

## 🚀 Portable (no setup)

```bash
# Download and double-click
./dist/NoteManagerPy.exe
```

The app opens `http://127.0.0.1:5000` in your default browser automatically.

## 🐍 From source

```bash
git clone https://github.com/YOUR_USER/NoteManagerPy.git
cd NoteManagerPy
pip install -r requirements.txt
python src/app.py
```

Then open `http://127.0.0.1:5000` in your browser.

<br>

---

<br>

# Screenshot

```
 ┌─────────────────────────────────────────────────────────────┐
 │  ◀ Notes                                [+ New Note]        │
 │  ─────────────────────────────────────────────────────────  │
 │  All Notes (14)                        Search notes... 🔍   │
 │  ───────                               ┌─────────────────┐  │
 │  Tags                                  │ My Note Title    │  │
 │  ● python (3)     ────────────────     │ tag1  tag2  ✕   │  │
 │  ● flask (2)      │ Note Title    │    │ [Edit] [Preview] │  │
 │  ● docker (1)     │ First line... │    │ ───────────────  │  │
 │  ● testing (4)    │ 05 Jun 26     │    │                  │  │
 │  ● react (2)      └───────────────┘    │ # Hello World    │  │
 │  ● go (1)                              │                  │  │
 │                                        │ This is a **note**│  │
 │                                        │ with Markdown.   │  │
 │                                        └─────────────────┘  │
 └─────────────────────────────────────────────────────────────┘
```

<br>

---

<br>

# Usage

## Search for a Note

Type any keyword in the search bar. The app searches note titles and tags in real-time. Click any result to open it.

## Create a Note

Click **"+ New Note"** on the top bar. The editor opens on the right:
1. **Title** — enter a filename for your note
2. **Tags** — type to add tags; autocomplete suggests existing tags; click ✕ to remove
3. **Content** — write in Markdown or plain text; toggle **Preview** to see rendered output
4. **Auto-save** — changes are saved automatically; look for the "Saved" indicator

## Read / Edit a Note

- **By tag** — click a tag in the sidebar to filter notes, then click any note to open it
- **By search** — type in the search bar to find notes by title or tag
- **All notes** — click "All Notes" to browse everything

Edit inline, or toggle **Preview** to read the rendered version. Changes save automatically.

## Delete a Note

Click the 🗑️ trash icon in the editor toolbar.

<br>

---

<br>

# Project Structure

```
NoteManagerPy/
├── src/                      # Python source
│   ├── app.py                # Flask backend: CRUD API, tag parsing, Markdown render
│   ├── static/
│   │   ├── style.css         # Clean three-panel layout
│   │   └── script.js         # SPA logic: auto-save, tags, search, preview
│   └── templates/
│       └── index.html        # Three-panel UI (sidebar | list | editor)
├── scripts/
│   └── build_portable.py     # PyInstaller builder
├── notes/                    # Your .txt note files
├── dist/
│   └── NoteManagerPy.exe     # Portable executable (committed to repo)
├── requirements.txt
├── LICENSE                   # GPL-3.0
└── README.md
```

<br>

---

<br>

# Note File Format

Notes are standard `.txt` files with a two-line metadata header:

```text
Tags: python flask web
Created: 05 Jun 2026, 09:01 PM

Your note content starts here.

You can use **Markdown** or plain text.
```

This matches the original R script format exactly — files created by either version are fully interchangeable. Open them in any text editor independently.

<br>

---

<br>

# Build the Portable Executable

```bash
pip install -r requirements.txt
python scripts/build_portable.py
```

The `.exe` is written to `dist/NoteManagerPy.exe`.

<br>

---

<br>

# Credits

- **Original idea & R implementation** — [Bishwarup Paul](https://github.com/bishwaruppaul/NoteManageR)
- **Inspiration** — [Derek Sivers](https://sive.rs/plaintext), [Szymon Krajewski](https://szymonkrajewski.pl/taking-notes-in-plaintext/)
- **License** — [GNU General Public License v3.0](./LICENSE)
