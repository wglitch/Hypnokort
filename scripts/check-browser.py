"""Smoke checks for a locally served app. Requires Playwright and Chromium."""
from playwright.sync_api import sync_playwright
import json, sys
url = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4173/'
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844})
    page=context.new_page()
    page.set_default_timeout(10000)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url)
    page.wait_for_selector('.language-card')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path='/tmp/hypnokort-mobile.png',full_page=True)
    page.get_by_role('button',name='Språkgreppet',exact=False).click()
    assert page.locator('.detail').is_visible()
    page.get_by_role('button',name='Spara favorit',exact=True).click()
    page.get_by_role('button',name='Öppna biblioteket',exact=True).click()
    page.get_by_role('button',name='Visa bara favoriter',exact=True).click()
    page.get_by_role('button',name='Till kortleken',exact=False).click()
    assert page.locator('.counter').inner_text()=='1 / 1'
    page.reload()
    page.wait_for_selector('.language-card')
    assert page.get_by_role('button',name='Ta bort favorit',exact=True).is_visible()
    page.get_by_role('button',name='Öppna biblioteket',exact=True).click()
    page.get_by_role('button',name='NLP',exact=True).click()
    assert page.locator('.prompt-label').inner_text()=='Svara på:'
    page.get_by_role('searchbox',name='Sök bland korten').fill('N9')
    assert page.locator('.id').inner_text()=='N9'
    assert page.locator('.card-pattern.circles').count()==1
    page.get_by_role('button',name='Till kortleken',exact=False).click()
    page.screenshot(path='/tmp/hypnokort-nlp-mobile.png')
    assert page.evaluate('''(()=>{const c=document.querySelector('.language-card'),l=document.querySelector('.prompt-label'),r=l.getBoundingClientRect(),b=c.getBoundingClientRect();const s=getComputedStyle(c);return Math.abs(parseFloat(s.getPropertyValue('--pattern-x'))-(r.left+r.width/2-b.left))<2&&Math.abs(parseFloat(s.getPropertyValue('--pattern-y'))-(r.top+r.height/2-b.top))<2})()''')
    page.get_by_role('button',name='Möjlig ingång',exact=False).click()
    assert 'inom dig' in page.locator('.detail').inner_text()
    page.get_by_role('button',name='Öppna biblioteket',exact=True).click()
    page.get_by_role('searchbox',name='Sök bland korten').fill('zzzz-no-match')
    page.get_by_role('button',name='Till kortleken',exact=False).click()
    assert page.get_by_role('heading',name='Inga kort i det här urvalet.').is_visible()
    page.get_by_role('button',name='Visa alla kort',exact=True).click()
    assert page.locator('.counter').inner_text()=='1 / 86'
    page.get_by_role('button',name='Öppna biblioteket',exact=True).click()
    page.get_by_role('link',name='Övningar',exact=True).click()
    assert page.locator('.exercise-tile').count()==11
    page.locator('a[href="#ovning/mus"]').click()
    page.get_by_role('button',name='Skriv / diktera',exact=True).click()
    page.locator('#practice-notes').fill('Min svenska mening, som fortsätter …')
    page.reload()
    page.get_by_role('button',name='Skriv / diktera',exact=True).click()
    assert page.locator('#practice-notes').input_value()=='Min svenska mening, som fortsätter …'
    page.locator('#duration').select_option('30')
    page.clock.install()
    page.get_by_role('button',name='Starta övningen',exact=True).click()
    page.clock.fast_forward(1100)
    assert page.locator('#timer').inner_text()=='0:29'
    page.get_by_role('button',name='Pausa',exact=True).click()
    paused=page.locator('#timer').inner_text()
    page.clock.fast_forward(1100)
    assert page.locator('#timer').inner_text()==paused
    page.get_by_role('button',name='Fortsätt',exact=True).click()
    page.get_by_role('button',name='Återställ',exact=True).click()
    assert page.locator('#timer').inner_text()=='0:30'
    page.goto(url+'#ovning/embedded')
    page.wait_for_selector('.exercise-prompt')
    assert page.locator('[data-mode]').count()==0
    old=page.locator('.exercise-prompt').inner_text()
    page.get_by_role('button',name='Ny uppmaning',exact=False).click()
    assert page.locator('.exercise-prompt').inner_text()!=old
    page.goto(url+'#ovning/vav')
    page.wait_for_selector('#timer')
    page.clock.install()
    page.get_by_role('button',name='Starta övningen',exact=True).click()
    old=page.locator('.exercise-prompt').inner_text()
    page.clock.fast_forward(10100)
    assert page.locator('.exercise-prompt').inner_text()!=old
    assert page.locator('#word-history').inner_text()
    page.get_by_role('button',name='Öppna biblioteket',exact=True).click()
    page.get_by_role('link',name='Ljudpass',exact=True).click()
    assert page.locator('[data-audio-choice]').count()==11
    page.evaluate('''window.__spoken=[];window.speechSynthesis.speak=(u)=>{window.__spoken.push(u.text);setTimeout(()=>u.onend?.(),1)};window.speechSynthesis.cancel=()=>{}''')
    page.locator('#audio-rounds').select_option('1')
    page.locator('#audio-duration').select_option('30')
    page.get_by_role('button',name='Starta ljudpass',exact=True).click()
    page.clock.fast_forward(50)
    assert page.locator('#audio-status').inner_text().startswith('Din tur')
    assert page.locator('#audio-duration').is_disabled()
    page.clock.fast_forward(5000)
    page.get_by_role('button',name='Pausa',exact=True).click()
    remaining=page.locator('#audio-timer').inner_text()
    page.clock.fast_forward(5000)
    assert page.locator('#audio-timer').inner_text()==remaining
    page.get_by_role('button',name='Fortsätt',exact=True).click()
    page.clock.fast_forward(31000)
    page.clock.fast_forward(8000)
    assert 'klart' in page.locator('#audio-status').inner_text()
    assert page.locator('#audio-start').inner_text()=='Starta ljudpass'
    page.get_by_role('button',name='Öppna biblioteket',exact=True).click()
    page.get_by_role('link',name='Om labbet',exact=True).click()
    with page.expect_download() as download:
        page.get_by_role('button',name='Exportera mina sparade data').click()
    data=json.load(open(download.value.path()))
    assert 'B1' in data['favorites'] and 'mus' in data['notes']
    page.evaluate('localStorage.clear()')
    page.reload()
    page.locator('#import-data').set_input_files({'name':'import.json','mimeType':'application/json','buffer':json.dumps(data).encode()})
    page.wait_for_function("JSON.parse(localStorage.getItem('hypnokort.favorites')||'[]').includes('B1')")
    page.goto(url+'#kort')
    page.wait_for_selector('.language-card')
    page.set_viewport_size({'width':1280,'height':900})
    page.screenshot(path='/tmp/hypnokort-desktop.png',full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors, errors
    browser.close()
    print('PASS: mobile/desktop, filtering, favorites, NLP, 11 exercises, notes, timers, weaving, audio flow, export/import. No JS errors.')
