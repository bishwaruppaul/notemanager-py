"""
Build a standalone portable NoteManagerPy (onedir mode for fast startup).

Usage:
    python scripts/build_portable.py

Requires: pyinstaller (pip install pyinstaller)
"""

import os
import sys
import shutil
import subprocess


SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.dirname(SCRIPTS_DIR)
SRC_DIR = os.path.join(BUILD_DIR, 'src')
DIST_DIR = os.path.join(BUILD_DIR, 'dist')
ICON_PATH = os.path.join(BUILD_DIR, 'icon.ico')


def main():
    # Clean previous builds
    for d in ['build']:
        p = os.path.join(BUILD_DIR, d)
        if os.path.exists(p):
            try:
                shutil.rmtree(p)
            except PermissionError:
                print(f'Warning: could not fully remove {d}/, continuing...')

    out_dir = os.path.join(DIST_DIR, 'NoteManagerPy')
    if os.path.exists(out_dir):
        try:
            shutil.rmtree(out_dir)
        except PermissionError:
            pass

    data_args = []
    templates_dir = os.path.join(SRC_DIR, 'templates')
    static_dir = os.path.join(SRC_DIR, 'static')

    if os.path.exists(templates_dir):
        data_args.append(f'--add-data={templates_dir}{os.pathsep}templates')
    if os.path.exists(static_dir):
        data_args.append(f'--add-data={static_dir}{os.pathsep}static')

    icon_arg = []
    if os.path.exists(ICON_PATH):
        icon_arg = ['--icon', ICON_PATH]

    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--onedir',                        # fast startup, no self-extraction
        '--windowed',
        '--name', 'NoteManagerPy',
        '--distpath', DIST_DIR,
        '--noconfirm',
    ] + data_args + icon_arg + [
        os.path.join(SRC_DIR, 'app.py'),
    ]

    print('Building NoteManagerPy (onedir — fast startup)...')
    subprocess.check_call(cmd)

    exe_path = os.path.join(out_dir, 'NoteManagerPy.exe')
    if os.path.exists(exe_path):
        print(f'\nSuccess! Bundle created at:')
        print(f'  {out_dir}')
        print(f'\nRun NoteManagerPy.exe directly — launches instantly.')

        # Create a .bat launcher in dist root for convenience
        launcher = os.path.join(DIST_DIR, 'NoteManagerPy.bat')
        with open(launcher, 'w') as f:
            f.write('@echo off\n')
            f.write('start "" "%~dp0NoteManagerPy\\NoteManagerPy.exe"')
        print(f'  Launcher: {launcher}')
    else:
        print(f'\nBuild may have failed. Check PyInstaller output above.')


if __name__ == '__main__':
    main()
