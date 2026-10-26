"""Bundle local classic scripts and styles without changing their execution or cascade order."""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit

SCRIPT = re.compile(r'<script\b[^>]*>.*?</script\s*>', re.I | re.S)
STYLE = re.compile(r'<style\b[^>]*>.*?</style\s*>|<link\b[^>]*>', re.I | re.S)
ATTR = re.compile(r'([\w-]+)(?:\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+)))?')

def attributes(tag):
    opening = tag.split('>', 1)[0]
    return {m[0].lower(): next((v for v in m[1:] if v), '') for m in ATTR.findall(opening)}

def local_file(root, url):
    parts = urlsplit(url)
    if parts.scheme or parts.netloc or not parts.path or parts.path.startswith('//'):
        return None
    candidate = (root / parts.path.lstrip('/')).resolve()
    if not candidate.is_relative_to(root.resolve()) or not candidate.is_file():
        raise ValueError('Missing or invalid frontend asset: ' + url)
    return candidate

def emit(root, text, suffix):
    name = 'runtime-' + hashlib.sha256(text.encode()).hexdigest()[:16] + suffix
    (root / name).write_text(text, encoding='utf-8')
    return name

MAX_SCRIPT_BYTES = 256 * 1024

def bundle_html(root, html, optimized=None):
    optimized = optimized or {}
    # Optional features are inert script descriptors until requested.
    # Bundle their original order into one content-addressed, browser-cacheable file.
    lazy_groups = {}
    for match in SCRIPT.finditer(html):
        attrs = attributes(match.group())
        if attrs.get('type') == 'application/x-daraya-feature':
            asset = local_file(root, attrs['data-src'])
            lazy_groups.setdefault(attrs['data-feature'], []).append((match, asset))
    lazy_changes = []
    for feature, entries in lazy_groups.items():
        text = '\n;\n'.join(optimized.get(asset.name, asset.read_text(encoding='utf-8')) for _, asset in entries)
        name = emit(root, text, '.js')
        for i, (match, _) in enumerate(entries):
            replacement = f'<script type="application/x-daraya-feature" data-feature="{feature}" data-src="{name}"></script>' if i == 0 else ''
            lazy_changes.append((match.start(), match.end(), replacement))
    for start, end, replacement in sorted(lazy_changes, reverse=True):
        html = html[:start] + replacement + html[end:]
    # All style sources stay in their original cascade order, including inline rules.
    head_end = html.lower().find('</head>')
    head, tail = html[:head_end], html[head_end:]
    style_groups = []
    group = []
    def flush_styles():
        nonlocal group
        if group:
            style_groups.append(group)
            group = []
    for match in STYLE.finditer(head):
        tag = match.group()
        attrs = attributes(tag)
        if not tag.lower().startswith('<style') and attrs.get('rel', '').lower() != 'stylesheet':
            continue
        # Identified/disabled styles may be inspected or toggled by application code.
        if attrs.get('id') or 'disabled' in attrs:
            flush_styles()
            continue
        if tag.lower().startswith('<style'):
            css = tag.split('>', 1)[1].rsplit('</', 1)[0]
        else:
            asset = local_file(root, attrs.get('href', ''))
            if asset is None:
                flush_styles()
                continue
            css = asset.read_text(encoding='utf-8')
        if attrs.get('media'):
            css = '@media ' + attrs['media'] + '{\n' + css + '\n}'
        group.append((match.start(), match.end(), css))
    flush_styles()
    changes = []
    for group in style_groups:
        name = emit(root, '\n\n'.join(x[2] for x in group), '.css')
        for i, (start, end, _) in enumerate(group):
            changes.append((start, end, f'<link rel="stylesheet" href="{name}">' if i == 0 else ''))
    for start, end, replacement in sorted(changes, reverse=True):
        head = head[:start] + replacement + head[end:]
    html = head + tail
    # Keep non-strict scripts as explicit boundaries. Every bundled script was already
    # strict, so declarations still share the browser's global classic-script scope.
    groups = []
    group = []
    previous_end = None
    def flush():
        nonlocal group
        if group:
            groups.append(group)
            group = []
    for match in SCRIPT.finditer(html):
        attrs = attributes(match.group())
        asset = local_file(root, attrs['src']) if attrs.get('src') else None
        eligible = (asset is not None and 'defer' in attrs and 'async' not in attrs
                    and attrs.get('type', '').lower() in ('', 'text/javascript')
                    and not any(k in attrs for k in ('id', 'integrity', 'onload', 'onerror')))
        raw = asset.read_text(encoding='utf-8') if eligible else ''
        code = optimized.get(asset.name, raw) if eligible else ''
        strict = bool(re.match(r'''\s*(['"])use strict\1\s*;''', raw))
        if not eligible or not strict or (previous_end is not None and html[previous_end:match.start()].strip()):
            flush()
        if eligible and strict:
            if group and sum(len(entry[3].encode()) for entry in group) + len(code.encode()) > MAX_SCRIPT_BYTES:
                flush()
            group.append((match.start(), match.end(), asset.name, code))
        previous_end = match.end()
    flush()
    replacements = []
    for group in groups:
        if len(group) < 2 and not optimized:
            continue
        text = '\n;\n'.join('// ' + name + '\n' + code for _, _, name, code in group) + '\n'
        name = emit(root, text, '.js')
        replacements.append((group[0][0], group[-1][1], f'<script defer src="{name}"></script>'))
    for start, end, replacement in reversed(replacements):
        html = html[:start] + replacement + html[end:]
    return html

def bundle_frontend(root):
    root = Path(root)
    # Minify once, not once for every shop entry page. Build must fail on syntax errors.
    sources = {path.name: path.read_text(encoding='utf-8') for path in root.glob('*.js')
               if not path.name.startswith('runtime-')}
    helper = Path(__file__).with_name('minify_frontend.cjs')
    result = subprocess.run(['node', str(helper)], input=json.dumps(sources), text=True,
                            capture_output=True, check=True)
    optimized = json.loads(result.stdout)
    stats = []
    for path in sorted(root.rglob('*.html')):
        original = path.read_text(encoding='utf-8')
        # Only application entry pages; standalone privacy/SEO pages remain independent.
        if not re.search(r'<script\s+defer\s+src=', original):
            continue
        bundled = bundle_html(root, original, optimized)
        path.write_text(bundled, encoding='utf-8')
        stats.append({'page': str(path.relative_to(root)), 'before': len(original.encode()),
                      'after': len(bundled.encode())})
    return stats

if __name__ == '__main__':
    results = bundle_frontend(Path(sys.argv[1] if len(sys.argv) > 1 else '_site'))
    print(json.dumps({'bundled_pages': len(results), 'index': next((x for x in results if x['page'] == 'index.html'), None)}))
