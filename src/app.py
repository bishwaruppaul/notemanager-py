import sys
import os
import json
import glob
import shutil
import time
import threading
import urllib.request
from datetime import datetime
from urllib.parse import unquote

from flask import Flask, request, jsonify, render_template
import markdown as md_lib


APP_VERSION = '1.0.1'
REPO = 'bishwaruppaul/notemanager-py'

last_heartbeat = time.time()
HEARTBEAT_TIMEOUT = 120

_update_cache = {'data': None, 'time': 0}
UPDATE_CACHE_TTL = 3600


def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def get_resource_dir():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


NOTES_DIR = os.path.join(get_base_dir(), 'notes')
app = Flask(
    __name__,
    template_folder=os.path.join(get_resource_dir(), 'templates'),
    static_folder=os.path.join(get_resource_dir(), 'static'),
)


def ensure_notes_dir():
    os.makedirs(NOTES_DIR, exist_ok=True)


def parse_note(filepath):
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        lines = f.readlines()
    tags = []
    created = ''
    content_start = 0
    if lines:
        first = lines[0].strip()
        if first.startswith('Tags:'):
            tags = [t for t in first[5:].strip().split() if t]
            content_start = 1
    if len(lines) > 1:
        second = lines[1].strip()
        if second.startswith('Created:'):
            created = second[8:].strip()
            content_start = 2
    while content_start < len(lines) and lines[content_start].strip() == '':
        content_start += 1
    content = ''.join(lines[content_start:]).rstrip('\n')
    return {'tags': tags, 'created': created, 'content': content}


def write_note(filepath, title, tags, created, content):
    title = title.strip().replace('/', '-').replace('\\', '-')
    if not title:
        title = 'untitled'
    full_path = os.path.join(NOTES_DIR, title + '.txt')
    tag_str = ' '.join(tags)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(f'Tags: {tag_str}\n')
        f.write(f'Created: {created}\n')
        f.write('\n')
        f.write(content)
        if not content.endswith('\n'):
            f.write('\n')
    return title


def get_note_list():
    ensure_notes_dir()
    notes = []
    for fp in sorted(glob.glob(os.path.join(NOTES_DIR, '*.txt')), key=os.path.getmtime, reverse=True):
        fname = os.path.splitext(os.path.basename(fp))[0]
        try:
            parsed = parse_note(fp)
            preview = parsed['content'][:120].replace('\n', ' ').strip()
            if len(parsed['content']) > 120:
                preview += '...'
            notes.append({
                'id': fname,
                'title': fname,
                'tags': parsed['tags'],
                'created': parsed['created'],
                'preview': preview,
            })
        except Exception:
            notes.append({
                'id': fname,
                'title': fname,
                'tags': [],
                'created': '',
                'preview': '',
            })
    return notes


def get_tag_list(notes=None):
    if notes is None:
        notes = get_note_list()
    tag_counts = {}
    for n in notes:
        for t in n['tags']:
            tag_counts[t] = tag_counts.get(t, 0) + 1
    return [{'tag': k, 'count': v} for k, v in sorted(tag_counts.items())]


def activity_monitor():
    while True:
        time.sleep(30)
        if time.time() - last_heartbeat > HEARTBEAT_TIMEOUT:
            os._exit(0)


threading.Thread(target=activity_monitor, daemon=True).start()


def _parse_semver(v):
    try:
        return [int(x) for x in v.lstrip('v').split('.')]
    except (ValueError, AttributeError):
        return []


def _version_gte(v1, v2):
    p1, p2 = _parse_semver(v1), _parse_semver(v2)
    max_len = max(len(p1), len(p2))
    p1 += [0] * (max_len - len(p1))
    p2 += [0] * (max_len - len(p2))
    return p1 >= p2


def check_for_update():
    global _update_cache
    now = time.time()
    if _update_cache['data'] is not None and now - _update_cache['time'] < UPDATE_CACHE_TTL:
        return _update_cache['data']
    url = f'https://api.github.com/repos/{REPO}/releases/latest'
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'NoteManagerPy',
            'Accept': 'application/vnd.github.v3+json',
        })
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            tag = data.get('tag_name', '')
            latest_ver = tag.lstrip('v')
            result = {
                'update_available': _version_gte(latest_ver, APP_VERSION) and latest_ver != APP_VERSION,
                'latest_version': latest_ver,
                'download_url': data.get('html_url', f'https://github.com/{REPO}/releases/latest'),
                'current_version': APP_VERSION,
                'error': None,
            }
            _update_cache = {'data': result, 'time': now}
            return result
    except Exception as e:
        result = {
            'update_available': False,
            'latest_version': '',
            'download_url': '',
            'current_version': APP_VERSION,
            'error': str(e),
        }
        _update_cache = {'data': result, 'time': now}
        return result


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/notes')
def api_list_notes():
    notes = get_note_list()
    q = request.args.get('q', '').strip().lower()
    tag = request.args.get('tag', '').strip()
    if q:
        notes = [n for n in notes if q in n['title'].lower() or q in ' '.join(n['tags']).lower()]
    if tag:
        notes = [n for n in notes if tag in n['tags']]
    return jsonify(notes)


@app.route('/api/notes/<path:note_id>')
def api_get_note(note_id):
    note_id = unquote(note_id)
    fp = os.path.join(NOTES_DIR, note_id + '.txt')
    if not os.path.exists(fp):
        return jsonify({'error': 'Note not found'}), 404
    parsed = parse_note(fp)
    parsed['id'] = note_id
    parsed['title'] = note_id
    parsed['content_html'] = md_lib.markdown(parsed['content'])
    return jsonify(parsed)


@app.route('/api/notes', methods=['POST'])
def api_create_note():
    data = request.get_json()
    title = data.get('title', '').strip()
    tags = data.get('tags', [])
    content = data.get('content', '')
    created = datetime.now().strftime('%d %b %Y, %I:%M %p')
    final_title = write_note(NOTES_DIR, title, tags, created, content)
    return jsonify({'id': final_title, 'title': final_title, 'tags': tags, 'created': created}), 201


@app.route('/api/notes/<path:note_id>', methods=['PUT'])
def api_update_note(note_id):
    note_id = unquote(note_id)
    fp = os.path.join(NOTES_DIR, note_id + '.txt')
    if not os.path.exists(fp):
        return jsonify({'error': 'Note not found'}), 404
    data = request.get_json()
    tags = data.get('tags', [])
    content = data.get('content', '')
    old_parsed = parse_note(fp)
    created = old_parsed['created'] or datetime.now().strftime('%d %b %Y, %I:%M %p')
    new_title = data.get('title', '').strip() or note_id
    if new_title != note_id:
        new_fp = os.path.join(NOTES_DIR, new_title + '.txt')
        if os.path.exists(new_fp) and new_fp != fp:
            return jsonify({'error': 'A note with this title already exists'}), 409
        write_note(NOTES_DIR, new_title, tags, created, content)
        os.remove(fp)
    else:
        write_note(NOTES_DIR, note_id, tags, created, content)
    return jsonify({'id': new_title, 'title': new_title, 'tags': tags, 'created': created})


@app.route('/api/notes/<path:note_id>', methods=['DELETE'])
def api_delete_note(note_id):
    note_id = unquote(note_id)
    fp = os.path.join(NOTES_DIR, note_id + '.txt')
    if not os.path.exists(fp):
        return jsonify({'error': 'Note not found'}), 404
    os.remove(fp)
    return jsonify({'ok': True})


@app.route('/api/tags')
def api_list_tags():
    notes = get_note_list()
    return jsonify(get_tag_list(notes))


@app.route('/api/notes/by-tag/<path:tag_name>')
def api_notes_by_tag(tag_name):
    tag_name = unquote(tag_name)
    notes = get_note_list()
    filtered = [n for n in notes if tag_name in n['tags']]
    return jsonify(filtered)


@app.route('/api/export')
def api_export():
    notes = get_note_list()
    data = []
    for n in notes:
        fp = os.path.join(NOTES_DIR, n['id'] + '.txt')
        parsed = parse_note(fp) if os.path.exists(fp) else {'content': ''}
        data.append({'title': n['title'], 'tags': n['tags'], 'created': n['created'], 'content': parsed['content']})
    return jsonify(data)


@app.route('/api/check-update')
def api_check_update():
    return jsonify(check_for_update())


@app.route('/api/heartbeat')
def api_heartbeat():
    global last_heartbeat
    last_heartbeat = time.time()
    return '', 204


@app.route('/api/shutdown', methods=['POST'])
def api_shutdown():
    threading.Thread(target=lambda: (time.sleep(0.3), os._exit(0)), daemon=True).start()
    return jsonify({'ok': True})


if __name__ == '__main__':
    ensure_notes_dir()
    port = int(os.environ.get('PORT', 5000))
    try:
        import webbrowser
        try:
            webbrowser.open(f'http://127.0.0.1:{port}')
        except Exception:
            pass
    except ImportError:
        pass
    print(f'  NoteManagerPy running at http://127.0.0.1:{port}')
    print(f'  Notes directory: {NOTES_DIR}')
    app.run(host='127.0.0.1', port=port, debug=False)
