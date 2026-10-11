from pathlib import Path
from urllib.parse import urlparse, unquote
import mimetypes
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text(encoding='utf-8').replace('<head>','<head><base href="http://deck.local/">',1)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
    page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
    def handler(route,request):
        parsed=urlparse(request.url)
        if parsed.scheme in ('http','https') and parsed.netloc=='deck.local':
            rel=unquote(parsed.path.lstrip('/')) or 'index.html'
            path=(ROOT/rel).resolve()
            try: path.relative_to(ROOT.resolve())
            except Exception: return route.fulfill(status=403,body='forbidden')
            if path.exists() and path.is_file():
                return route.fulfill(path=str(path),content_type=mimetypes.guess_type(path.name)[0] or 'application/octet-stream')
            return route.fulfill(status=404,body='not found')
        return route.abort()
    page.route('**/*',handler)
    page.set_content(html,wait_until='load')
    page.evaluate('document.fonts.ready')
    page.emulate_media(media='print')
    page.pdf(path=str(ROOT/'slides.pdf'),print_background=True,prefer_css_page_size=True,width='1280px',height='720px',margin={'top':'0','right':'0','bottom':'0','left':'0'})
    browser.close()
