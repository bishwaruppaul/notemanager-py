# NoteManagerPy

A portable note manager with Markdown support, tag organization, and material design. Runs entirely in your browser.

## Quick start

### Windows
Download `NoteManagerPy-Windows.exe` from [Releases](https://github.com/anomalyco/notemanager/releases) and double-click it.

### Linux
Download `NoteManagerPy-Linux`, make it executable, and run:
```bash
chmod +x NoteManagerPy-Linux
./NoteManagerPy-Linux
```

### macOS
Download `NoteManagerPy-macOS`, make it executable, and run:
```bash
chmod +x NoteManagerPy-macOS
./NoteManagerPy-macOS
```

The app opens at [http://127.0.0.1:5000](http://127.0.0.1:5000) — no Python or installation needed.

## Build from source

```bash
pip install -r requirements.txt
python scripts/build.py
```

This produces a standalone executable for your current platform.

## Release a new version

```bash
python scripts/release.py 1.0.0
```

This pushes a `v1.0.0` tag, triggering GitHub Actions to build for Windows, Linux, and macOS.
