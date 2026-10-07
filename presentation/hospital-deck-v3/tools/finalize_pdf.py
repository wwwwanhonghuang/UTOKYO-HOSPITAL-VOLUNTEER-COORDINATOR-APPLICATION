"""Make exported slide-PDF references portable; retain offline HTML references."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, TextStringObject

deck = Path(__file__).resolve().parents[1]
manifest = json.loads((deck / 'evidence_manifest.json').read_text(encoding='utf-8'))
by_file = {Path(p['local_pdf']).name: p['url'] for p in manifest['papers']}
by_id = {p['id']: p['url'] for p in manifest['papers']}
source = deck / 'slides.pdf'
writer = PdfWriter(clone_from=PdfReader(source))
count = 0
for page in writer.pages:
    for ref in page.get('/Annots', []):
        action = ref.get_object().get('/A', {})
        uri = action.get('/URI', '')
        if not uri.startswith('file:'):
            continue
        parsed = urlsplit(uri)
        filename = Path(unquote(parsed.path)).name
        target = by_id.get(parsed.fragment) if filename == 'evidence.html' else by_file.get(filename)
        assert target, f'Unmapped local PDF reference: {uri}'
        action[NameObject('/URI')] = TextStringObject(target)
        count += 1
writer.add_metadata({'/Title': '学問と実践のあいだに', '/Author': '黄 万鴻',
                     '/Subject': '研究原稿・図表を伴う発表資料'})
temporary = deck / 'slides-portable.tmp.pdf'
writer.write(temporary)
temporary.replace(source)
print(json.dumps({'portable_pdf_references': count}))
