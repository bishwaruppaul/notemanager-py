"""
Build a standalone executable for the current platform.
User only needs to double-click the resulting file — no Python required.

Usage:
    python scripts/build.py

Overrides:
    NM_OUTPUT_NAME  — custom output filename (without platform suffix)

Requires: pyinstaller (pip install pyinstaller)
"""

import os
import sys
import shutil
import subprocess
import platform

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.dirname(SCRIPTS_DIR)
SRC_DIR = os.path.join(BUILD_DIR, 'src')
ICON_PATH = os.path.join(BUILD_DIR, 'icon.ico')

SYSTEM = platform.system()
IS_WINDOWS = SYSTEM == 'Windows'
IS_MACOS = SYSTEM == 'Darwin'
IS_LINUX = SYSTEM == 'Linux'


def find_output(base_name):
    """Find the built output (file or .app) in BUILD_DIR matching base_name."""
    candidates = [
        os.path.join(BUILD_DIR, base_name),
        os.path.join(BUILD_DIR, base_name + '.app'),
        os.path.join(BUILD_DIR, base_name + '.exe'),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    # Try any file starting with base_name
    for f in os.listdir(BUILD_DIR):
        full = os.path.join(BUILD_DIR, f)
        if f.startswith(base_name) and (os.path.isfile(full) or f.endswith('.app')):
            return full
    return None


def main():
    # Determine output name
    out_name = os.environ.get('NM_OUTPUT_NAME', 'NoteManagerPy')
    if IS_WINDOWS and not out_name.endswith('.exe') and not out_name.endswith('.app'):
        out_name += '.exe'

    out_path = os.path.join(BUILD_DIR, out_name)
    for existing in [out_path, out_path + '.app']:
        if os.path.exists(existing):
            try:
                if os.path.isdir(existing):
                    shutil.rmtree(existing, ignore_errors=True)
                else:
                    os.remove(existing)
            except PermissionError:
                pass

    # Clean build work dir
    build_work = os.path.join(BUILD_DIR, 'build')
    if os.path.exists(build_work):
        shutil.rmtree(build_work, ignore_errors=True)

    # Data files to bundle
    sep = ';' if IS_WINDOWS else ':'
    data_args = []
    for folder in ['templates', 'static']:
        path = os.path.join(SRC_DIR, folder)
        if os.path.exists(path):
            data_args.append(f'--add-data={path}{sep}{folder}')

    icon_arg = []
    if os.path.exists(ICON_PATH):
        if IS_WINDOWS:
            icon_arg = ['--icon', ICON_PATH]
        elif IS_MACOS:
            # macOS requires .icns format; build without icon on CI
            if ICON_PATH.endswith('.icns'):
                icon_arg = ['--icon', ICON_PATH]

    platform_flags = []
    if not IS_LINUX:  # --windowed on Windows and macOS (suppress terminal)
        platform_flags.append('--windowed')

    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--onefile',
        '--distpath', BUILD_DIR,
        '--workpath', build_work,
        '--specpath', build_work,
        '--noconfirm',
    ] + platform_flags + data_args + icon_arg + [
        '--name', out_name.replace('.exe', '').replace('.app', ''),
        os.path.join(SRC_DIR, 'app.py'),
    ]

    print(f'Building NoteManagerPy for {SYSTEM}...')
    subprocess.check_call(cmd)

    base = out_name.replace('.exe', '').replace('.app', '')
    result = find_output(base)
    if result:
        size = os.path.getsize(result) if os.path.isfile(result) else 0
        size_mb = size / 1_000_000
        print(f'\nSuccess! Standalone executable: {result} ({size_mb:.1f} MB)')
        print('Double-click it to run — no Python installation needed.')
    else:
        print('\nBuild may have failed. Check output above.')
        sys.exit(1)


if __name__ == '__main__':
    main()
