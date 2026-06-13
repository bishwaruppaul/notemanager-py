import urllib.request
import re
import hashlib
import os

FONTS = {
    'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'JetBrains Mono': 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap',
}

ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
fonts_dir = 'src/static/fonts'

for family, url in FONTS.items():
    name = family.replace(' ', '')
    req = urllib.request.Request(url, headers={'User-Agent': ua})
    with urllib.request.urlopen(req) as resp:
        css = resp.read().decode()

    blocks = re.findall(r'@font-face\s*\{[^}]+\}', css, re.DOTALL)
    print(family + ': ' + str(len(blocks)) + ' blocks')

    for block in blocks:
        url_match = re.search(r'url\(([^)]+)\)', block)
        if not url_match:
            continue
        font_url = url_match.group(1).strip('\'"')

        h = hashlib.md5(font_url.encode()).hexdigest()[:8]
        filename = name + '-' + h + '.woff2'
        filepath = os.path.join(fonts_dir, filename)

        if os.path.exists(filepath):
            continue

        print('  Downloading ' + filename + '...')
        try:
            req2 = urllib.request.Request(font_url, headers={'User-Agent': ua})
            with urllib.request.urlopen(req2) as resp2:
                with open(filepath, 'wb') as f:
                    f.write(resp2.read())
            size = os.path.getsize(filepath)
            print('    OK (' + str(size) + ' bytes)')
        except Exception as e:
            print('    FAILED: ' + str(e))

# Output @font-face rules
print('\n=== @font-face rules ===\n')
for family, url in FONTS.items():
    name = family.replace(' ', '')
    req = urllib.request.Request(url, headers={'User-Agent': ua})
    with urllib.request.urlopen(req) as resp:
        css = resp.read().decode()
    blocks = re.findall(r'@font-face\s*\{[^}]+\}', css, re.DOTALL)

    # Group by actual font file (hash) to avoid duplicates
    seen_urls = {}
    for block in blocks:
        url_match = re.search(r'url\(([^)]+)\)', block)
        if not url_match:
            continue
        font_url = url_match.group(1).strip('\'"')
        if font_url in seen_urls:
            continue
        seen_urls[font_url] = block

    for font_url, block in seen_urls.items():
        h = hashlib.md5(font_url.encode()).hexdigest()[:8]
        local_url = 'fonts/' + name + '-' + h + '.woff2'

        result = '@font-face {\n'
        result += '  font-family: \'' + family + '\';\n'

        style_match = re.search(r'font-style:\s*(\w+)', block)
        result += '  font-style: ' + (style_match.group(1) if style_match else 'normal') + ';\n'

        # Use weight range for variable fonts (JetBrains Mono is a variable font)
        result += '  font-weight: 400 700;\n'
        result += '  font-display: swap;\n'
        result += '  src: url(' + local_url + ') format(\'woff2\');\n'

        ur_match = re.search(r'unicode-range:\s*([^;]+)', block)
        if ur_match:
            result += '  unicode-range: ' + ur_match.group(1) + ';\n'

        result += '}'
        print(result)
        print()

print('Done.')
