"""
Create a GitHub release tag and push it.
This triggers the CI build workflow to build for all platforms.

Usage:
    python scripts/release.py 1.0.0

Requires: git remote with push access.
"""

import sys
import subprocess
import os

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.dirname(SCRIPTS_DIR)


def main():
    if len(sys.argv) < 2:
        print('Usage: python scripts/release.py VERSION')
        print('Example: python scripts/release.py 1.0.0')
        sys.exit(1)

    version = sys.argv[1].lstrip('v')
    tag = f'v{version}'

    # Check git status
    result = subprocess.run(['git', 'status', '--porcelain'],
                          capture_output=True, text=True, cwd=BUILD_DIR)
    if result.stdout.strip():
        print('Uncommitted changes detected. Commit or stash them first.')
        sys.exit(1)

    # Create and push tag
    print(f'Creating tag {tag}...')
    subprocess.check_call(['git', 'tag', tag], cwd=BUILD_DIR)
    subprocess.check_call(['git', 'push', 'origin', tag], cwd=BUILD_DIR)

    print(f'\nTag {tag} pushed!')
    print('GitHub Actions will now build for Windows, Linux, and macOS.')
    print('Download the executables from the release once CI completes.')


if __name__ == '__main__':
    main()
