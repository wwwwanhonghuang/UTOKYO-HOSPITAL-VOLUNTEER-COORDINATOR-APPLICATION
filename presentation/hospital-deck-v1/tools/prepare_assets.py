"""Embed the single Markdown script and subset local Noto fonts for offline use.

Run from any directory with Python and fontTools installed. Original material
and the reference template are never written by this script.
"""
from pathlib import Path
import argparse
import hashlib
import html
import json
import re
from fontTools import subset
from fontTools.ttLib import TTFont

DECK = Path(__file__).resolve().parents[1]

def paragraph_html(text):
    paragraphs = re.split(r"\n\s*\n", text.strip())
    return "\n".join("<p>" + html.escape(p.strip()).replace("\n", " ") + "</p>" for p in paragraphs if p.strip())

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--font-dir', type=Path, default=Path('C:/Windows/Fonts'))
    parser.add_argument('--notes-only', action='store_true')
    args = parser.parse_args()
    text = (DECK / 'speaker_script.md').read_text(encoding='utf-8')
    document = (DECK / 'index.html').read_text(encoding='utf-8')
    chunks = re.split(r'^## (\d{2})｜([^\n]+)\n', text, flags=re.M)
    assert len(chunks) == 46, 'Expected exactly 15 numbered script sections'
    notes = {}
    for i in range(1, len(chunks), 3):
        number, title, chunk = chunks[i:i+3]
        chunk = re.split(r'^---\s*$', chunk, flags=re.M)[0]
        intent = re.search(r'\*\*设计意图：\*\*\s*(.*?)\n', chunk).group(1)
        ja, zh = re.search(r'### 日本語の発表原稿\s*(.*?)### 中文对照\s*(.*)', chunk, re.S).groups()
        notes[int(number)] = (title.strip(), ja.strip(), zh.strip(), intent)
    def attach(match):
        start, number, body = match.group(1), int(match.group(2)), match.group(3)
        title, ja, zh, intent = notes[number]
        assert f'data-title="{title}"' in start, f'Title mismatch on page {number}'
        body = re.sub(r'\s*<aside class="speaker-notes".*?</aside>', '', body, flags=re.S)
        content = (f'\n<aside class="speaker-notes" aria-hidden="true">\n'
                   f'<p class="note-intent" lang="zh-CN">{html.escape(intent)}</p>\n'
                   f'<h3>日本語の発表原稿</h3><div lang="ja">{paragraph_html(ja)}</div>\n'
                   f'<details><summary>中文对照</summary><div lang="zh-CN">{paragraph_html(zh)}</div></details>\n'
                   '</aside>\n')
        return start + body + content + '</section>'
    document = re.sub(r'(<section\b[^>]*\bid="slide-(\d+)"[^>]*>)(.*?)</section>', attach, document, flags=re.S)
    (DECK / 'index.html').write_text(document, encoding='utf-8')
    if not args.notes_only:
        corpus = document + text + (DECK / 'assets/js/deck.js').read_text(encoding='utf-8')
        chars = {ord(c) for c in corpus} | set(range(32, 127))
        reports = []
        for source, target in [('NotoSansJP-VF.ttf', 'noto-sans-jp.woff'),
                               ('NotoSerifJP-VF.ttf', 'noto-serif-jp.woff'),
                               ('NotoSansSC-VF.ttf', 'noto-sans-sc.woff')]:
            font = TTFont(args.font_dir / source)
            metadata = {str(k): list(dict.fromkeys(n.toUnicode() for n in font['name'].names if n.nameID == k)) for k in (0, 1, 2, 13, 14)}
            available = set(font.getBestCmap())
            options = subset.Options()
            options.layout_features = ['*']
            options.name_IDs = ['*']
            options.name_legacy = True
            options.name_languages = ['*']
            subsetter = subset.Subsetter(options=options)
            subsetter.populate(unicodes=chars)
            subsetter.subset(font)
            font.flavor = 'woff'
            dest = DECK / 'assets/fonts' / target
            font.save(dest)
            reports.append({'file':target, 'source':source, 'metadata':metadata,
                            'characters':len(chars & available), 'bytes':dest.stat().st_size,
                            'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
        (DECK / 'assets/fonts/font_sources.json').write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding='utf-8')
    japanese_chars = sum(len(re.sub(r'\s', '', v[1])) for v in notes.values())
    print(json.dumps({'slides':len(notes), 'japanese_script_characters':japanese_chars,
                      'embedded_notes':document.count('class="speaker-notes"'), 'fonts_built':not args.notes_only}))

if __name__ == '__main__':
    main()
