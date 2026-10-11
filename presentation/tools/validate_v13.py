from pathlib import Path
from urllib.parse import urlparse, unquote
import json, mimetypes, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text(encoding='utf-8')
html = html.replace('<head>', '<head><base href="http://deck.local/">', 1)
errors=[]
failed=[]
requested=[]
overflows=[]

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={"width":1280,"height":720}, device_scale_factor=1)
    page.on('console', lambda msg: errors.append(f'console {msg.type}: {msg.text}') if msg.type in ('error',) else None)
    page.on('pageerror', lambda exc: errors.append(f'pageerror: {exc}'))
    def handler(route, request):
        url=request.url
        requested.append(url)
        parsed=urlparse(url)
        if parsed.scheme in ('http','https') and parsed.netloc == 'deck.local':
            rel=unquote(parsed.path.lstrip('/')) or 'index.html'
            path=(ROOT/rel).resolve()
            try:
                path.relative_to(ROOT.resolve())
            except Exception:
                failed.append(url); return route.fulfill(status=403, body='forbidden')
            if path.exists() and path.is_file():
                ctype=mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
                return route.fulfill(path=str(path), content_type=ctype)
            failed.append(url); return route.fulfill(status=404, body='not found')
        # no runtime external network allowed
        failed.append(url)
        return route.abort()
    page.route('**/*', handler)
    page.set_content(html, wait_until='load')
    page.evaluate('document.fonts.ready')
    state=page.evaluate('window.Deck && Deck.getState()')
    slide_count=page.locator('#stage > section.slide').count()
    note_count=page.locator('#stage > section.slide .speaker-notes').count()
    title_count=page.locator('#stage > section.slide h1, #stage > section.slide h2').count()
    for i in range(1, slide_count+1):
        page.evaluate('(i)=>Deck.goTo(i,true)', i)
        page.wait_for_timeout(25)
        issue=page.evaluate('''(i)=>{
          const s=document.querySelector(`#slide-${i}`);
          if(!s) return {missing:true};
          const sr=s.getBoundingClientRect();
          const els=[...s.querySelectorAll('*')].filter(el=>{
            if(el.closest('.speaker-notes')) return false;
            const cs=getComputedStyle(el);
            if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0) return false;
            const r=el.getBoundingClientRect();
            return r.width>0.5 && r.height>0.5;
          });
          const out=[];
          for(const el of els){
            const r=el.getBoundingClientRect();
            const tol=1.5;
            if(r.left < sr.left-tol || r.right > sr.right+tol || r.top < sr.top-tol || r.bottom > sr.bottom+tol){
              // anchors/buttons around evidence figures are allowed only when their figure itself fits;
              // everything else should stay inside the 1280×720 slide canvas.
              out.push({tag:el.tagName, cls:el.className||'', text:(el.innerText||'').trim().slice(0,80), rect:[r.left,r.top,r.right,r.bottom], slide:[sr.left,sr.top,sr.right,sr.bottom]});
            }
          }
          return {scroll:[s.scrollWidth,s.scrollHeight], client:[s.clientWidth,s.clientHeight], out:out.slice(0,12)};
        }''', i)
        if issue.get('missing') or issue.get('out'):
            overflows.append({'slide':i, **issue})
    # Mobile scaling smoke check
    page.set_viewport_size({"width":390,"height":844})
    page.wait_for_timeout(80)
    mobile=page.evaluate('''()=>{
      const v=document.getElementById('viewport').getBoundingClientRect();
      const s=document.getElementById('stage').getBoundingClientRect();
      return {viewport:[v.width,v.height], stage:[s.width,s.height], scale:getComputedStyle(document.documentElement).getPropertyValue('--scale').trim()};
    }''')
    browser.close()

patterns = {
  'negation_reversal': r'ではなく|ではありません|だけでなく|けれども|わけではない|しない、という',
  'jp_question_mark': r'？',
}
scans={k:len(re.findall(v, html)) for k,v in patterns.items()}
result={
  'slide_count':slide_count,
  'speaker_notes_count':note_count,
  'title_count':title_count,
  'deck_state':state,
  'console_errors':errors,
  'failed_runtime_requests':sorted(set(failed)),
  'overflow_issues':overflows,
  'rhetoric_scan':scans,
  'mobile_fit':mobile,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
(ROOT/'validation_v13_runtime.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
