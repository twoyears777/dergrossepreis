"""Automatische Tests für Manna („Der große Preis“ und Werkzeuge).

Startet einen lokalen Webserver, öffnet die App in Chromium und spielt die
wichtigsten Abläufe durch. Beendet sich mit Fehlercode, wenn etwas nicht stimmt.

Die Spielesammlung wird mit festen Testspielen geprüft (tests/testspiele/), nicht mit
den echten Spielen. So bricht kein Test, wenn im Editor ein Spiel dazukommt oder wegfällt.
Der Editor wird gegen ein nachgebautes GitHub geprüft, es wird nichts veröffentlicht.

Lokal ausführen:   pip install playwright && python -m playwright install chromium
                   python tests/run_tests.py          (braucht Node.js für den Bau der Spiele)
"""
import base64, functools, hashlib, http.server, json, os, re, socketserver, subprocess, sys, tempfile, threading, traceback
from urllib.parse import urlparse, parse_qs, unquote
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8799
URL = f'http://localhost:{PORT}/index.html'
EDITOR = f'http://localhost:{PORT}/editor/'
FIXTURE = {'json': b''}   # was der Testserver als spiele/alle.json ausliefert
CHROME = os.environ.get('CHROME_PATH')  # optional: eigener Browser

results = []
def tiny_png(w=40, h=30):
    import zlib, struct
    raw = b''.join(b'\x00' + bytes([90, 140, 120]) * w for _ in range(h))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')

def check(name, cond, info=''):
    results.append((name, bool(cond), info))
    print(('  ok   ' if cond else '  FAIL ') + name + (f'  ({info})' if info and not cond else ''))

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
        def do_GET(self):
            if self.path.split('?')[0] == '/spiele/alle.json':
                self.send_response(200); self.send_header('Content-Type', 'application/json')
                self.send_header('Cache-Control', 'no-cache'); self.end_headers(); self.wfile.write(FIXTURE['json']); return
            return super().do_GET()
    handler = functools.partial(Quiet, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('localhost', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def go(m, card):
    # Der große Preis, Eigenes Spiel und Countdown liegen unter „Gameshows“
    if m.locator('#home.show').count(): m.click('#gcShows'); m.wait_for_timeout(150)
    m.click(card)

def static_checks():
    print('Statische Prüfungen')
    emoji = re.compile('[\U0001F000-\U0001FAFF☀-⛿✀-➿️]')
    allowed = set('✕✓★')
    for f in ['index.html', 'rechtliches.html', 'css/app.css', 'js/app.js', 'js/data.js', 'js/spielformat.js', 'editor/index.html', 'editor/editor.js', 'editor/editor.css']:
        txt = open(os.path.join(ROOT, f), encoding='utf-8').read()
        found = sorted(set(c for c in emoji.findall(txt) if c not in allowed))
        check(f'keine Emojis in {f}', not found, ''.join(found))
        check(f'keine Schreibmaschinen-/Handschrift in {f}', not re.search('Courier|Typewriter|Marker Felt|Comic Sans', txt))
    idx = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    check('keine offenen Text-Platzhalter in index.html', '[[' not in idx, ', '.join(re.findall(r'\[\[([^\]]+)\]\]', idx)))
    appjs = open(os.path.join(ROOT, 'js/app.js'), encoding='utf-8').read()
    check('keine offenen Text-Platzhalter in app.js', not re.search(r'\[\[[A-ZÄÖÜ][^\]\[]*\]\]', appjs), ', '.join(re.findall(r'\[\[([^\]]+)\]\]', appjs)))
    legal = open(os.path.join(ROOT, 'rechtliches.html'), encoding='utf-8').read()
    offen = len(re.findall(r'class="ph"|\[\[', legal))
    # Impressum-Daten kommen mit 1.21 (Online-Impressum). Bis dahin nur Hinweis, kein Fehler.
    if offen: print(f'  HINWEIS Rechtliches: an {offen} Stellen steht noch „folgt“ (Impressum-Daten fehlen)')
    check('Rechtliches: Impressum nach § 5 DDG', '§ 5 DDG' in legal and 'id="impressum"' in legal)
    check('Rechtliches: Datenschutz und weitere Hinweise', 'id="datenschutz"' in legal and 'id="hinweise"' in legal)
    data = open(os.path.join(ROOT, 'js/data.js'), encoding='utf-8').read()
    sw = open(os.path.join(ROOT, 'sw.js'), encoding='utf-8').read()
    v1 = re.search(r"APP_VERSION='([\d.]+)'", data).group(1)
    v2 = re.search(r"const VERSION = '([\d.]+)'", sw).group(1)
    check('Version in data.js und sw.js gleich', v1 == v2, f'{v1} / {v2}')
    md = open(os.path.join(ROOT, 'CHANGELOG.md'), encoding='utf-8').read()
    check('CHANGELOG.md enthält aktuelle Version', f'## {v1}' in md)
    for f in ['rechtliches.html', 'css/app.css', 'js/spielformat.js', 'js/data.js', 'js/app.js', 'img/shot-brett.jpg', 'img/shot-eigenes.jpg', 'img/shot-countdown.jpg', 'img/shot-sammlung.jpg']:
        check(f'Service Worker cached {f}', f"'./{f}'" in sw)
        check(f'Datei vorhanden: {f}', os.path.exists(os.path.join(ROOT, f)))

def build(src, out):
    return subprocess.run(['node', os.path.join(ROOT, 'tools', 'build-spiele.js'), src, out], capture_output=True, text=True)

def spiele_checks():
    print('Spiele (Textdateien)')
    r = build(os.path.join(ROOT, 'spiele'), os.path.join(ROOT, 'spiele', 'alle.json'))
    check('echte Spiele bauen fehlerfrei', r.returncode == 0, (r.stdout + r.stderr).strip())
    if r.returncode == 0:
        d = json.load(open(os.path.join(ROOT, 'spiele', 'alle.json'), encoding='utf-8'))
        check('echte Spiele: mindestens eins', len(d['spiele']) > 0)
        check('echte Spiele: Pflichtangaben', all(g['name'] and g['kurz'] and g['alter'] and g['ort'] and g['ablauf'] for g in d['spiele']))
    out = os.path.join(ROOT, 'tests', '.testspiele.json')
    r = build(os.path.join(ROOT, 'tests', 'testspiele'), out)
    check('Testspiele bauen', r.returncode == 0, r.stderr)
    FIXTURE['json'] = open(out, 'rb').read()
    with tempfile.TemporaryDirectory() as t:
        open(os.path.join(t, 'kaputt.txt'), 'w', encoding='utf-8').write('MANNA-SPIEL v1\nName: Kaputt\nAlter: Senioren\n')
        r = build(t, os.path.join(t, 'alle.json'))
        check('fehlerhafte Spieldatei stoppt den Bau', r.returncode == 1 and 'Kurzbeschreibung' in r.stderr and 'Senioren' in r.stderr and not os.path.exists(os.path.join(t, 'alle.json')), r.stderr)
        open(os.path.join(t, 'kaputt.txt'), 'w', encoding='utf-8').write(open(os.path.join(ROOT, 'tests', 'testspiele', 'simon-says.txt'), encoding='utf-8').read())
        r = build(t, os.path.join(t, 'alle.json'))
        check('Dateiname muss zum Namen passen', r.returncode == 1 and 'simon-says.txt' in r.stderr, r.stderr)

def format_checks(m):
    print('Textformat')
    res = m.evaluate(r"""(()=>{const F=MannaSpiel;
      const t='MANNA-SPIEL v1\nName: Ochs am Berg\nKurzbeschreibung: Anschleichen , solange keiner schaut.\nAlter: Kinder, Jugendliche\nPersonen: ab 5\nOrt: draußen\nDauer: -\n\nMaterial:\n- keins\n\nAblauf:\n1. Eine Person steht an der Wand.\n- Die anderen schleichen.\nWer sich bewegt, muss zurück.\n\nGefahren und Risiken:\n- Nicht rennen.\n';
      const p=F.parse(t);
      return {fehler:p.fehler,g:p.spiel,again:F.serialize(p.spiel),slug:F.slug('Ächz Übung – Groß!'),
        bad:F.parse('Name: X').fehler.length,pers:F.parse(t.replace('ab 5','8 bis 15')).spiel.spieler,
        palermo:F.parse(F.serialize(F.parse(t+'\nRollen-Tabelle:\nA | B\n1 | 2\n').spiel)).spiel.rollen,
        html:F.ablaufHtml(p.spiel,x=>x),alt:F.ablaufHtml({ablauf:['A','B']},x=>x),
        frei:(()=>{const q=F.serialize(F.parse(t.replace('Material:\n- keins','Material:\nEin Ball')).spiel);return q.slice(q.indexOf('Material:'),q.indexOf('Ablauf:')-1);})(),
        ph:F.parse(t.replace('Dauer: -','Dauer: -\nGruppenphasen: Ablösungsphase, Rollenfindungsphase')).spiel.phasen,
        phErr:F.parse(t.replace('Dauer: -','Dauer: -\nGruppenphasen: Chaosphase')).fehler,
        freiRisk:F.serialize(F.parse(t.replace('- Nicht rennen.','Nicht rennen.')).spiel).includes('Gefahren und Risiken:\nNicht rennen.\n')}})()""")
    g = res['g']
    check('Format: lesen ohne Fehler', res['fehler'] == [], res['fehler'])
    check('Format: Angaben übernommen', g['alter'] == ['kinder', 'jugend'] and g['spieler'] == {'min': 5, 'max': 9999} and g['ort'] == ['draussen'] and g['dauer'] == '' and g['material'] == [], g)
    check('Format: Wortlaut bleibt, nur Aufzählungszeichen weg', g['ablauf'] == ['Eine Person steht an der Wand.', 'Die anderen schleichen.', 'Wer sich bewegt, muss zurück.'] and g['kurz'] == 'Anschleichen , solange keiner schaut.', g['ablauf'])
    check('Format: Ablauf-Zeilen behalten ihr eigenes Zeichen', g['ablaufZeilen'] == ['1. Eine Person steht an der Wand.', '- Die anderen schleichen.', 'Wer sich bewegt, muss zurück.'], g.get('ablaufZeilen'))
    check('Format: schreiben ohne automatische Nummern', 'Ablauf:\n1. Eine Person steht an der Wand.\n- Die anderen schleichen.\nWer sich bewegt, muss zurück.\n' in res['again'], res['again'])
    check('Format: Ablauf als Absatz, Punkt und Nummer', res['html'] == '<ol><li value="1">Eine Person steht an der Wand.</li></ol><ul><li>Die anderen schleichen.</li></ul><p>Wer sich bewegt, muss zurück.</p>', res['html'])
    check('Format: Material und Gefahren ohne automatische Punkte', res['frei'] == 'Material:\nEin Ball\n' and res['freiRisk'], res['frei'])
    check('Format: ältere Spiele ohne Zeilen weiter nummeriert', res['alt'] == '<ol><li value="1">A</li><li value="2">B</li></ol>', res['alt'])
    check('Format: Personen „8 bis 15“', res['pers'] == {'min': 8, 'max': 15})
    check('Format: Gruppenphasen lesen', res['ph'] == ['rollen', 'abloesung'], res['ph'])
    check('Format: unbekannte Gruppenphase meldet Fehler', any('Gruppenphasen' in f for f in res['phErr']), res['phErr'])
    check('Format: Rollen-Tabelle', res['palermo'] == {'liste': [], 'tabelle': {'kopf': ['A', 'B'], 'zeilen': [['1', '2']]}}, res['palermo'])
    check('Format: Dateiname aus Namen', res['slug'] == 'aechz-uebung-gross', res['slug'])
    check('Format: Pflichtangaben werden geprüft', res['bad'] >= 5)

def browser_checks(p):
    errs = []
    b = p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 800}, accept_downloads=True)
    m = ctx.new_page(); m.on('pageerror', lambda e: errs.append('Moderator: ' + str(e))); m.on('console', (lambda c: errs.append('CSP: ' + c.text) if 'Content Security Policy' in c.text else None))
    store = lambda: m.evaluate("JSON.parse(localStorage.grosserPreis_v1)")
    scores = lambda: [t['score'] for t in store()['teams']]

    print('Startseite & Menüs')
    m.goto(URL); m.wait_for_timeout(400)
    format_checks(m)
    check('Startseite sichtbar', m.locator('#home.show').count() == 1)
    check('Minuspunkte entfernt', m.locator('#sMinus').count() == 0)
    check('Startseite: Kacheln Gameshows und Spielesammlung', m.locator('#home .gcard .wbar').all_inner_texts() == ['Spielesammlung', 'Pädagogischer Kram', 'Gameshows'], m.locator('#home .gcard .wbar').all_inner_texts())
    m.click('#gcShows'); m.wait_for_timeout(200)
    check('Gameshows: drei Kacheln', m.locator('#showsScreen.show').count() == 1 and m.locator('#showsScreen .gcard .wbar').all_inner_texts() == ['Der große Preis', 'Eigenes Spiel', 'Countdown'], m.locator('#showsScreen .gcard .wbar').all_inner_texts())
    m.click('#btnShowsBack'); m.wait_for_timeout(150)
    check('Gameshows: zurück zur Startseite', m.locator('#home.show').count() == 1)
    m.click('#gcPaed'); m.wait_for_timeout(200)
    check('Pädagogischer Kram: Seite mit Artikel Gruppenphasen', m.locator('#paedScreen.show').count() == 1 and m.locator('#paedScreen .gcard .wbar').all_inner_texts() == ['Gruppenphasen', 'Vier-Ohren-Modell – die vier Ebenen der Kommunikation'])
    m.click('#gcArtOhren'); m.wait_for_timeout(200)
    check('Artikel Vier-Ohren-Modell: vier Ebenen', m.locator('#artOhren.show').count() == 1 and m.locator('#artOhren .note h3').all_inner_texts() == ['Sachinhalt', 'Selbstoffenbarung', 'Beziehung', 'Appell'], m.locator('#artOhren .note h3').all_inner_texts())
    m.click('#artOhren .back-top'); m.wait_for_timeout(150)
    check('Vier-Ohren-Modell: zurück zu Pädagogischer Kram', m.locator('#paedScreen.show').count() == 1)
    m.click('#gcArtPhasen'); m.wait_for_timeout(200)
    check('Artikel Gruppenphasen: fünf Phasen', m.locator('#artPhasen .note h3').all_inner_texts() == ['Anfangsphase', 'Rollenfindungsphase', 'Vertrautheitsphase', 'Differenzierungsphase', 'Ablösungsphase'], m.locator('#artPhasen .note h3').all_inner_texts())
    check('Artikel: zurück zu Pädagogischer Kram', m.inner_text('#btnArtBack') == '← Pädagogischer Kram')
    m.click('#btnArtBack'); m.wait_for_timeout(150); m.click('#paedScreen .back-top'); m.wait_for_timeout(150)
    check('Zurück-Knopf oben auf Unterseiten', m.locator('#home.show').count() == 1)
    check('Marke „Manna“ auf der Startseite', m.get_attribute('#homeBrand', 'aria-label') == 'Manna' and m.evaluate("document.querySelector('#homeBrand img').naturalWidth>0") and m.title() == 'Manna')
    check('Screenshot-Collage mit 4 Bildern', m.locator('.collage .shot img').count() == 4)
    loaded = m.evaluate("Promise.all([...document.querySelectorAll('.collage img')].map(i=>{i.loading='eager';return i.decode().then(()=>i.naturalWidth>0,()=>false)}))")
    check('Screenshots laden', all(loaded), loaded)
    heads = m.locator('#home .hblock h2').all_inner_texts()
    check('Bereiche auf der Startseite', heads == ['Wir wissen, was es in der Jugendarbeit braucht!', "So einfach geht's", 'Was wollen wir?'], heads)
    intro = m.inner_text('#homeIntro') if m.locator('#homeIntro').count() else ''
    check('Kurze Erklärung unter dem Titel', m.locator('#homeBrand + #homeIntro + .gamegrid').count() == 1 and 'Jugendarbeit' in intro, intro)
    m.click('#lnkVision'); m.wait_for_timeout(900)
    check('Link springt zur Vision', m.evaluate("(()=>{const r=document.querySelector('#vision').getBoundingClientRect();return r.top<innerHeight&&r.bottom>0})()") and '#' not in m.url)
    m.evaluate('scrollTo(0,0)')
    check('Startseite verlinkt Impressum und Datenschutz', m.get_attribute('#lnkLegal', 'href') == 'rechtliches.html')
    check('Laptop/PC: Beamer-Spiele nicht gesperrt', not m.evaluate('isHandyOderTablet()'))
    m.click('#homeVer'); m.wait_for_timeout(200)
    check('Changelog öffnet', m.locator('#clDialog.show').count() == 1)
    check('Changelog ohne Datum', not re.search(r'\d{1,2}\.\d{1,2}\.\d{4}', m.inner_text('#clBody')))
    m.click('#clX')
    go(m, '#gcPreis'); m.wait_for_timeout(200)
    labels = m.locator('#gmList .mbtn').all_inner_texts()
    check('Spielmenü-Einträge', labels == ['Neues Spiel mit aktuellem Spielbrett', 'Neues Spiel mit leerem Spielbrett', 'Vorlagen', 'Erklärung', 'Einstellungen'], labels)
    m.locator('.mbtn', has_text='Erklärung').click(); m.wait_for_timeout(200)
    check('Erklärung öffnet', m.locator('#helpScreen.show').count() == 1 and 'Sonderregeln' in m.inner_text('#helpScreen'))
    m.click('#btnHelpBack')
    m.locator('.mbtn', has_text='Vorlagen').click(); m.wait_for_timeout(200)
    names = [n.strip() for n in m.locator('#tplList .trow .mbtn').all_inner_texts()]
    check('drei Standard-Vorlagen', names == ['Gemischtes Quiz', 'Bibel-Quiz', 'Weihnachtsquiz'], names)
    check('Teilen-Tipp bei Vorlagen', 'Tipp:' in m.inner_text('#tplList'))
    m.click('#btnTplBack')

    print('Spielesammlung')
    m.click('#btnGmBack'); m.click('#btnShowsBack'); m.click('#gcColl'); m.wait_for_timeout(200)
    check('Spielesammlung öffnet', m.locator('#collScreen.show').count() == 1)
    check('kein Knopf „Spiel erstellen“', m.locator('#btnGameNew').count() == 0 and m.locator('#geScreen').count() == 0)
    check('Filtergruppen', m.locator('.flabel').all_inner_texts() == ['Alter', 'Personen', 'Ort', 'Material', 'Favoriten'], m.locator('.flabel').all_inner_texts())
    check('Personen-Filter 3–9, 10–19, 20–39, 40+', m.locator('.fgroup').nth(1).locator('.fchip').all_inner_texts() == ['3–9', '10–19', '20–39', '40 und mehr'])
    rows = m.locator('.game-row .gname').all_inner_texts()
    check('Spiele gelistet', rows == ['Nachts in Palermo', 'Simon Says', 'Zeitungsschlagen'], rows)
    m.locator('.fchip', has_text='40 und mehr').click()
    check('Filter 40+: nur Simon Says', m.locator('.game-row .gname').all_inner_texts() == ['Simon Says'])
    m.click('#btnFilterReset'); m.locator('.fchip', has_text='Ohne Material').click()
    check('Filter „Ohne Material“: nur Simon Says', m.locator('.game-row .gname').all_inner_texts() == ['Simon Says'])
    m.click('#btnFilterReset'); m.locator('.fchip', has_text='Kinder (6–12)').click()
    check('Kein Treffer: Hinweis statt Liste', m.locator('.game-row').count() == m.evaluate("GAMES.filter(g=>g.alter.includes('kinder')).length") and (m.locator('.game-row').count() > 0 or m.locator('.games-empty').count() == 1))
    m.click('#btnFilterReset'); m.locator('.fchip', has_text='Erwachsene').click()
    check('Filter Erwachsene: nur Palermo', m.locator('.game-row .gname').all_inner_texts() == ['Nachts in Palermo'])
    m.click('#btnFilterReset')
    for chip in ['Jugendliche (13–17)', '10–19', 'Drinnen', 'Mit Material']: m.locator('.fchip', has_text=chip).click()
    check('Kombinierte Filter finden beide', m.locator('.game-row').count() == 2)
    m.reload(); m.wait_for_timeout(400); m.click('#gcColl'); m.wait_for_timeout(200)
    check('Filter bleiben gespeichert', m.locator('.fchip.on').count() == 4)
    m.click('#btnFilterReset')
    m.locator('.game-row', has_text='Zeitungsschlagen').click(); m.wait_for_timeout(300)
    sheet = m.inner_text('#gameSheet')
    check('Spiel-Detailseite', m.locator('#gameScreen.show').count() == 1 and 'So geht' in sheet)
    steps = m.locator('#gameScreen .game-notes ol li').all_inner_texts()
    check('Detailseite: Schritte ohne doppelte Nummern', len(steps) > 0 and not any(re.match(r'\d+[.)] ', x) for x in steps), steps[:2])
    check('Bereich „Gefahren und Risiken“', m.locator('.note.risk').count() == 1 and 'Oberschenkel' in m.inner_text('.note.risk'))
    check('Detailseite: „Pädagogische Gedanken“ und „Fragen zum Nachgespräch“', m.locator('#gameSheet .note.paed').count() == 2 and 'Aufmerksamkeit' in m.inner_text('#gameSheet') and 'spannendsten' in m.inner_text('#gameSheet'))
    check('Detailseite: Gruppenphasen als Schilder', m.locator('#gameSheet .phase-chip').all_inner_texts() == ['Anfangsphase', 'Vertrautheitsphase'], m.locator('#gameSheet .phase-chip').all_inner_texts())
    m.locator('#gameSheet .phase-chip', has_text='Vertrautheitsphase').click(); m.wait_for_timeout(500)
    check('Gruppenphase führt zum Artikel', m.locator('#artPhasen.show').count() == 1 and m.evaluate("(()=>{const r=document.querySelector('#phase-vertraut').getBoundingClientRect();return r.top>=0&&r.top<innerHeight})()"))
    check('Artikel: zurück zum Spiel', m.inner_text('#btnArtBack') == '← Zurück zum Spiel' and m.inner_text('#artPhasen .back-top') == '← Zurück zum Spiel')
    m.click('#artPhasen .back-top'); m.wait_for_timeout(200)
    check('Zurück-Knopf oben führt zurück zum Spiel', m.locator('#gameScreen.show').count() == 1)
    m.click('#btnGameBack'); m.locator('.game-row', has_text='Simon Says').click(); m.wait_for_timeout(300)
    check('Alle fünf Phasen: ein Schild „Alle Gruppenphasen“', m.locator('#gameSheet .phase-chip').all_inner_texts() == ['Alle Gruppenphasen'], m.locator('#gameSheet .phase-chip').all_inner_texts())
    m.click('#btnGameBack'); m.locator('.game-row', has_text='Zeitungsschlagen').click(); m.wait_for_timeout(300)
    m.click('#btnGameBack'); m.locator('.game-row', has_text='Palermo').click(); m.wait_for_timeout(300)
    check('Palermo: Rollen mit Verteilungstabelle', m.locator('.role-table tbody tr').count() == 4 and 'Kommissar' in m.inner_text('#gameSheet'))
    m.click('#btnGameBack'); m.wait_for_timeout(200)

    print('Favoriten, Zufall, Speicher')
    m.locator('.game-row', has_text='Palermo').click(); m.wait_for_timeout(300)
    check('Detailseite: Knopf „Favorit“', m.inner_text('#btnFav') == 'Favorit' and m.get_attribute('#btnFav', 'aria-pressed') == 'false')
    m.click('#btnFav')
    check('Favorit: Knopf zeigt gemerkt (Farbe, aria-pressed)', m.locator('#btnFav.on').count() == 1 and m.get_attribute('#btnFav', 'aria-pressed') == 'true')
    m.click('#btnGameBack'); m.wait_for_timeout(200)
    check('Liste: Stern beim Favoriten', m.locator('.game-row', has_text='Palermo').locator('.gfav').count() == 1 and m.locator('.gfav').count() == 1)
    m.locator('.fchip', has_text='Nur Favoriten').click(); m.wait_for_timeout(150)
    check('Filter „Nur Favoriten“', m.locator('.game-row .gname').all_inner_texts() == ['★ Nachts in Palermo'], m.locator('.game-row .gname').all_inner_texts())
    m.reload(); m.wait_for_timeout(400); m.click('#gcColl'); m.wait_for_timeout(200)
    check('Favoriten bleiben gespeichert', m.locator('.game-row').count() == 1 and m.locator('.gfav').count() == 1)
    m.click('#btnRandom'); m.wait_for_timeout(300)
    check('Zufälliges Spiel öffnet ein passendes Spiel', m.locator('#gameScreen.show').count() == 1 and 'Mafia' in m.inner_text('#gameSheet .game-lead'))
    m.click('#btnFav'); m.click('#btnGameBack'); m.wait_for_timeout(200)
    check('Kein Treffer: kein Zufallsknopf', m.locator('.game-row').count() == 0 and not m.locator('#btnRandom').is_visible())
    m.click('#btnFilterReset'); m.wait_for_timeout(150)
    check('Zufallsknopf bei Treffern sichtbar', m.locator('#btnRandom').is_visible())
    seen = set()
    for _ in range(12):
        m.click('#btnRandom'); m.wait_for_timeout(120); seen.add(m.inner_text('#gameTitle')); m.click('#btnGameBack'); m.wait_for_timeout(80)
    check('Zufall wählt verschiedene Spiele', len(seen) >= 2, seen)
    check('Dauerhafter Speicher wird angefragt', m.evaluate("typeof askPersist==='function'") and 'askPersist' in open(os.path.join(ROOT, 'js/app.js'), encoding='utf-8').read())

    print('Spielesammlung ohne App-Update')
    d = json.loads(FIXTURE['json']); orig = FIXTURE['json']
    d['spiele'].append(dict(d['spiele'][0], id='neues-testspiel', name='Neues Testspiel'))
    # Der Service Worker läuft sonst nur unter https (GitHub Pages), hier für den Test von Hand starten
    m.click('#btnCollBack')
    m.evaluate("navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready)"); m.reload(); m.wait_for_timeout(800)
    check('Service Worker aktiv', m.evaluate("!!navigator.serviceWorker.controller"))
    m.click('#gcColl'); m.wait_for_timeout(300); m.click('#btnCollBack')
    FIXTURE['json'] = json.dumps(d).encode()
    m.reload(); m.wait_for_timeout(800); m.click('#gcColl'); m.wait_for_timeout(300)
    check('neues Spiel erscheint ohne neue Version', 'Neues Testspiel' in m.locator('.game-row .gname').all_inner_texts(), m.locator('.game-row .gname').all_inner_texts())
    d2 = json.loads(FIXTURE['json']); d2['spiele'].append(dict(d2['spiele'][0], id='noch-ein-spiel', name='Noch ein Spiel'))
    FIXTURE['json'] = json.dumps(d2).encode()
    m.click('#btnCollBack'); m.wait_for_timeout(150); m.click('#gcColl'); m.wait_for_timeout(500)
    check('neues Spiel erscheint beim Öffnen der Sammlung, ohne Neuladen', 'Noch ein Spiel' in m.locator('.game-row .gname').all_inner_texts())
    check('Spiele für offline zwischengespeichert', m.evaluate("caches.open('manna-spiele').then(c=>c.match('spiele/alle.json')).then(r=>r?r.json():null).then(j=>!!j&&j.spiele.some(g=>g.name==='Neues Testspiel'))"))
    FIXTURE['json'] = orig
    ed = ctx.new_page(); ed.goto(EDITOR); ed.wait_for_timeout(400)
    check('Editor öffnet trotz Service Worker (nicht die App)', ed.title() == 'Manna Editor', ed.title())
    check('Editor lädt das aktuelle Spieleformat (nicht aus dem Offline-Speicher)', ed.evaluate("typeof MannaSpiel.zeilenVon") == 'function'); ed.close()
    lg = ctx.new_page(); lg.goto(URL.replace('index.html', '') + 'rechtliches.html'); lg.wait_for_timeout(400)
    check('Rechtliches öffnet trotz Service Worker (nicht die App)', lg.locator('#impressum').count() == 1, lg.title()); lg.close()
    ctx.set_offline(True)
    lg = ctx.new_page()
    try:
        lg.goto(URL.replace('index.html', '') + 'rechtliches.html'); lg.wait_for_timeout(400)
        check('Rechtliches auch offline', lg.locator('#datenschutz').count() == 1)
    except Exception as e:
        check('Rechtliches auch offline', False, str(e)[:80])
    lg.close(); ctx.set_offline(False)
    m.evaluate("navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister())))"); m.reload(); m.wait_for_timeout(600)
    m.click('#gcColl'); m.wait_for_timeout(300)
    m.click('#btnCollBack'); m.wait_for_timeout(200)
    go(m, '#gcPreis'); m.wait_for_timeout(200)

    print('Spielablauf')
    m.locator('.mbtn', has_text='aktuellem Spielbrett').click(); m.wait_for_timeout(300)
    if m.locator('#dialog.show').count(): m.click('#dYes')
    check('Spielbrett mit 25 Feldern', m.locator('.tile').count() == 25)
    m.locator('.tile').nth(0).click(); m.wait_for_timeout(400)
    check('Lösung zunächst verdeckt', not m.locator('#qAnswer').is_visible())
    m.click('#btnShowAnswer'); check('Lösung zeigen', m.locator('#qAnswer').is_visible())
    m.click('#btnOk'); m.wait_for_timeout(300)
    check('Punkte für Gruppe A', scores()[:2] == [10, 0], scores())
    # Multiple Choice (Allgemeinwissen 20 -> Feld 5), Gruppe B am Zug
    m.locator('.tile').nth(5).click(); m.wait_for_timeout(400)
    m.locator('.mcopt').nth(1).click(); m.locator('.mcopt').nth(0).click()
    check('MC: genau eine Antwort eingeloggt', m.locator('.mcopt.locked').count() == 1)
    check('MC: Auslosen erst nach falscher Antwort', not m.locator('#btnSecond').is_visible())
    m.click('#btnShowAnswer'); m.wait_for_timeout(1700)
    check('MC: falsch, richtige Antwort bleibt verdeckt', m.locator('.mcopt.wrong').count() == 1 and m.locator('.mcopt.right').count() == 0 and m.locator('#btnSecond').is_visible())
    m.evaluate('window.__r=Math.random;Math.random=()=>0.99')   # Auslosen vorhersagbar machen: letzte andere Gruppe
    m.click('#btnSecond'); m.wait_for_timeout(200)
    drawn = m.evaluate("S.teams.find(t=>t.id===cur.second).name")
    m.evaluate('Math.random=window.__r')
    check('MC: andere Gruppe ausgelost', drawn and drawn != 'Gruppe B' and drawn in m.inner_text('#qTurn'), drawn)
    m.evaluate("document.querySelectorAll('#qExtra .mcopt')[0].click()")
    check('MC: falsche Antwort nicht noch einmal wählbar', m.locator('.mcopt.locked').count() == 0)
    m.locator('.mcopt').nth(1).click(); m.click('#btnShowAnswer'); m.wait_for_timeout(1700)
    check('MC: zweite Chance richtig aufgedeckt', m.locator('.mcopt.right').count() == 1)
    before = scores()
    m.click('#btnOk'); m.wait_for_timeout(300)
    gained = [b - a for a, b in zip(before, scores())]
    check('MC: halbe Punktzahl für ausgeloste Gruppe', sorted(gained, reverse=True)[:2] == [10, 0] and gained.count(10) == 1, gained)
    # Schätzfrage (Schätzen 10 -> Feld 3)
    m.locator('.tile').nth(3).click(); m.wait_for_timeout(400)
    ins = m.locator('.estrow input'); ins.nth(0).fill('1.500'); ins.nth(1).fill('1440')
    m.click('#btnOk'); m.wait_for_timeout(300)
    check('Schätzfrage: nächster Wert markiert', m.locator('.estrow.sel').count() == 1 and 'Gruppe B' in m.inner_text('.estrow.sel'))
    m.click('#btnOk'); m.wait_for_timeout(300)
    check('Schätzfrage: Punkte vergeben', scores()[1] == 10, scores())
    # Rückgängig
    m.click('#btnUndo'); m.click('#dYes'); m.wait_for_timeout(300)
    check('Rückgängig', scores()[1] == 0, scores())

    print('Zuschaueransicht & ACTION')
    m.click('#btnSettings'); m.wait_for_timeout(200)
    m.locator('.item').nth(4).locator('.seg button.action').click()   # Allgemeinwissen 100
    m.locator('.item').nth(4).locator('.tx').fill('Alle Gruppen: lautester Jubel!')
    m.click('#btnBack'); m.wait_for_timeout(300)
    with m.expect_popup() as pi: m.click('#btnViewer')
    v = pi.value; v.on('pageerror', lambda e: errs.append('Zuschauer: ' + str(e))); v.on('console', (lambda c: errs.append('CSP: ' + c.text) if 'Content Security Policy' in c.text else None)); v.wait_for_timeout(1300)
    check('Zuschaueransicht verbunden', m.evaluate("document.body.classList.contains('mod')"))
    m.locator('.tile').nth(20).click(); m.wait_for_timeout(500)
    check('ACTION-Animation auf beiden Bildschirmen', m.locator('#actionFx.show').count() == 1 and v.locator('#actionFx.show').count() == 1)
    m.wait_for_timeout(1700)
    check('Beamer zeigt Frage nach Animation', v.locator('#qOverlay.show').count() == 1)
    turn_name = m.evaluate("S.teams[S.turn].name"); before = scores()
    m.locator('#halfPick .chip', has_text=turn_name).click(); m.click('#btnOk'); m.wait_for_timeout(500)
    check('ACTION: ziehende Gruppe bekommt doppelte Punkte', max(b - a for a, b in zip(before, scores())) == 200, [b - a for a, b in zip(before, scores())])
    check('Ergebnis-Animation auf beiden Bildschirmen', m.locator('#doneFx.show').count() == 1 and v.locator('#doneFx.show').count() == 1)
    m.wait_for_timeout(2800)
    m.locator('.tile').nth(1).click(); m.wait_for_timeout(400)
    check('Moderator sieht Lösung vorab', m.locator('#qAnswer').is_visible())
    check('Beamer sieht Lösung nicht', not v.locator('#qAnswer').is_visible())
    m.click('#btnShowAnswer'); m.wait_for_timeout(300)
    check('Beamer sieht Lösung nach Freigabe', v.locator('#qAnswer').is_visible())
    check('Frage: Auslosen sofort möglich', m.locator('#btnSecond').is_visible())
    m.click('#btnSecond'); m.wait_for_timeout(400)
    sec = m.evaluate("S.teams.find(t=>t.id===cur.second).name"); turn_now = m.evaluate("S.teams[S.turn].name")
    check('Frage: andere Gruppe ausgelost, auf beiden Bildschirmen', sec != turn_now and sec in m.inner_text('#qTurn') and sec in v.inner_text('#qTurn') and not m.locator('#btnSecond').is_visible(), (sec, turn_now))
    half_txt = m.inner_text('#btnOk')
    check('Frage: Geschafft-Knopf für die halbe Punktzahl', sec in half_txt and '+' in half_txt, half_txt)
    m.click('#qX'); m.wait_for_timeout(200)

    print('Siegerehrung')
    m.click('#btnFinish'); m.click('#dYes'); m.wait_for_timeout(500)
    check('Moderator: nur Knopf', m.locator('#endScreen.mod-only').count() == 1 and not m.locator('#ceremony').is_visible())
    v.wait_for_timeout(6000)
    check('Beamer: Sieger enthüllt', v.locator('#endTitle.on').count() == 1)
    m.click('#btnEndMenu'); m.wait_for_timeout(600)
    check('zurück zu den Gameshows', m.locator('#showsScreen.show').count() == 1)
    check('Beamer wieder im Startbild', v.locator('#vSplash.show').count() == 1)

    print('Countdown')
    go(m, '#gcTimer'); m.wait_for_timeout(400)
    check('Countdown öffnet', m.locator('#timerScreen.show').count() == 1)
    check('Zuschauer: nur Hintergrund', v.locator('#vTimer.show').count() == 1 and v.inner_text('#vtmStage').strip() == '')
    m.locator('#tmPresets .fchip', has_text='30 Sek').click()
    for _ in range(5): m.click('.tm-step button[data-d="-5"]')
    check('Zeit einstellen (0:05)', m.inner_text('#tmMin') == '0' and m.inner_text('#tmSec') == '05')
    m.click('#tmStart'); m.wait_for_timeout(1300)
    check('Zuschauer sieht laufenden Countdown', re.fullmatch(r'0:0[34]', v.inner_text('#vtmStage').strip()) is not None, v.inner_text('#vtmStage'))
    m.click('#tmPause'); t1 = v.inner_text('#vtmStage'); m.wait_for_timeout(1200)
    check('Pause hält die Zeit an', v.inner_text('#vtmStage') == t1)
    m.click('#tmPause'); m.wait_for_timeout(4500)
    check('„Zeit vorbei!“ beim Zuschauer', v.get_attribute('#vtmStage .ransom, #vtmStage [aria-label]', 'aria-label') == 'Zeit vorbei!' or 'Zeit vorbei' in (v.inner_text('#vtmStage') or '').replace('\n', ''))
    m.wait_for_timeout(4500)
    check('danach wieder nur Hintergrund', v.inner_text('#vtmStage').strip() == '')
    check('Moderator zeigt wieder eingestellte Zeit', '0:05' in m.inner_text('#tmStage'))
    m.click('#btnTimerBack'); m.wait_for_timeout(400)
    check('zurück zu den Gameshows, Beamer im Startbild', m.locator('#showsScreen.show').count() == 1 and v.locator('#vSplash.show').count() == 1)

    print('Eigenes Spiel')
    go(m, '#gcOwn'); m.wait_for_timeout(300)
    check('Übersicht „Eigenes Spiel“', m.locator('#ownScreen.show').count() == 1)
    m.locator('#ownList .mbtn', has_text='Neues eigenes Spiel').click(); m.wait_for_timeout(300)
    check('Einrichten öffnet mit 5 Runden', m.locator('#ownEdit.show').count() == 1 and m.locator('.oe-round').count() == 5)
    m.locator('.oe-sec').nth(0).locator('input').fill('Testolympiade')
    m.locator('.oe .fchip', has_text='Jede Runde einen mehr').click()
    for _ in range(3): m.locator('.oe-step', has_text='Anzahl Runden').locator('button').nth(0).click()
    check('Anzahl Runden einstellen', m.locator('.oe-round').count() == 2)
    check('Wertung steigend erklärt', 'Runde 2: 2 Punkte' in m.inner_text('.oe-ex'), m.inner_text('.oe-ex'))
    rd = m.locator('.oe-round')
    rd.nth(0).locator('input').fill('Teebeutel-Weitwurf'); rd.nth(0).locator('textarea').fill('Wer am weitesten wirft, gewinnt.')
    rd.nth(0).locator('button', has_text='+ Weitere Folie').click()
    rd.nth(0).locator('.oe-slide textarea').fill('Nur auf dem Rasen werfen.')
    rd.nth(0).locator('.oe-slide button', has_text='Bild hinzufügen').click()
    img = os.path.join(ROOT, 'tests', '.bild.png'); open(img, 'wb').write(tiny_png())
    m.set_input_files('#oeImgFile', img); m.wait_for_timeout(800)
    check('Bild hochladen', m.evaluate("(()=>{const i=document.querySelector('.oe-slide .oe-img img');return !!i&&i.naturalWidth>0})()"))
    rd.nth(1).locator('input').fill('Schuhe-Stapeln')
    m.click('#btnOeSave'); m.wait_for_timeout(300)
    check('Spiel gespeichert', m.evaluate("JSON.parse(localStorage.grosserPreis_own).length") == 1)
    m.click('#btnOeStart'); m.wait_for_timeout(1200)
    check('Spielansicht startet', m.locator('#ownPlay.show').count() == 1 and m.locator('#opScores .team').count() == 4)
    check('Beamer zeigt Titelfolie', v.locator('#ownPlay.show').count() == 1 and v.get_attribute('#opStage .os-big', 'aria-label') == 'Teebeutel-Weitwurf')
    check('Beamer ohne Moderator-Knöpfe', not v.locator('#opNav').is_visible() and not v.locator('.team .adj').first.is_visible())
    m.click('#btnOpNext'); m.wait_for_timeout(500)
    check('Erklärungsfolie', 'Wer am weitesten wirft' in v.inner_text('#opStage'))
    m.click('#btnOpNext'); m.wait_for_timeout(900)
    check('Weitere Folie mit Bild auf dem Beamer', v.evaluate("(()=>{const i=document.querySelector('#opStage .os-img img');return !!i&&i.naturalWidth>0})()"))
    check('Letzte Folie: „Runde werten“', m.inner_text('#btnOpNext') == 'Runde werten')
    m.click('#btnOpNext'); m.wait_for_timeout(300)
    check('Wertung öffnet (nur Moderator)', m.locator('#opAward.show').count() == 1 and not v.locator('#opAward').is_visible())
    m.locator('#opAward .fchip', has_text='Gruppe B').click(); m.click('#opGive'); m.wait_for_timeout(600)
    own_scores = lambda: m.evaluate("JSON.parse(localStorage.grosserPreis_ownRun).teams.map(t=>t.score)")
    check('Runde 1: 1 Punkt für Gruppe B', own_scores() == [0, 1, 0, 0], own_scores())
    check('Punkte auf dem Beamer', v.locator('#opScores .team').nth(1).locator('.pts').inner_text() == '1')
    m.wait_for_timeout(2800)
    m.click('#btnOpUndo'); m.click('#dYes'); m.wait_for_timeout(300)
    check('Rückgängig: Punkte weg, Wertung offen', own_scores() == [0, 0, 0, 0] and m.locator('#opAward.show').count() == 1)
    check('Auswahl bleibt nach Rückgängig erhalten', m.locator('#opAward .fchip.on', has_text='Gruppe B').count() == 1)
    m.click('#opGive'); m.wait_for_timeout(3000)
    m.locator('#opScores .team').nth(2).locator('.adj button').nth(1).click(); m.wait_for_timeout(200)
    check('Punkte von Hand anpassen', own_scores() == [0, 1, 1, 0], own_scores())
    m.locator('#opScores .team').nth(2).locator('.adj button').nth(0).click()
    check('Runde 2: Titelfolie', v.get_attribute('#opStage .os-big', 'aria-label') == 'Schuhe-Stapeln' and 'bekommt 2 Punkte' in v.inner_text('#opStage'))
    m.keyboard.press('ArrowRight'); m.wait_for_timeout(300)
    check('Pfeiltaste öffnet Wertung', m.locator('#opAward.show').count() == 1)
    m.locator('#opAward .fchip', has_text='Gruppe A').click(); m.click('#opGive'); m.wait_for_timeout(400)
    check('Runde 2: 2 Punkte für Gruppe A', own_scores() == [2, 1, 0, 0], own_scores())
    m.wait_for_timeout(3200)
    check('Siegerehrung nach der letzten Runde', m.locator('#endScreen.show.mod-only').count() == 1 and v.locator('#endScreen.show').count() == 1)
    v.wait_for_timeout(6000)
    check('Beamer: Sieger Gruppe A', v.get_attribute('#endTitle', 'aria-label') == 'Gruppe A')
    m.click('#btnEndMenu'); m.wait_for_timeout(500)
    check('Danach Gameshows, Spielstand gelöscht', m.locator('#showsScreen.show').count() == 1 and m.evaluate("localStorage.grosserPreis_ownRun===undefined"))
    go(m, '#gcOwn'); m.wait_for_timeout(200)
    m.locator('#ownList .trow .mbtn', has_text='Testolympiade').click(); m.wait_for_timeout(300)
    with m.expect_download() as di: m.click('#btnOeExport')
    path_own = os.path.join(ROOT, 'tests', '.eigenes.json'); di.value.save_as(path_own)
    exp = json.load(open(path_own, encoding='utf-8'))
    check('Export mit Bild', exp.get('typ') == 'eigenes-spiel' and len(exp['spiele']) == 1 and len(exp['bilder']) == 1)
    m.click('#btnOeBack'); m.wait_for_timeout(200)
    m.locator('#ownList .trow', has_text='Testolympiade').locator('.tdel').click(); m.click('#dYes'); m.wait_for_timeout(200)
    check('Spiel löschen', m.locator('#ownList .trow').count() == 0)
    m.set_input_files('#ownFile', path_own); m.wait_for_timeout(500)
    check('Spiel importieren', m.locator('#ownList .trow', has_text='Testolympiade').count() == 1)
    os.remove(path_own); os.remove(img)
    m.click('#btnOwnBack'); m.wait_for_timeout(200)
    v.close(); m.wait_for_timeout(500)

    print('Vorlagen & Sicherung')
    go(m, '#gcPreis')
    check('Sicherungs-Hinweis nach Änderung', m.locator('#gmList .backup-note').count() == 1)
    with m.expect_download() as di: m.locator('#gmList .backup-note .primary').click()
    path = os.path.join(ROOT, 'tests', '.sicherung.json'); di.value.save_as(path)
    backup = json.load(open(path, encoding='utf-8'))
    check('Sicherung enthält Spielbrett', backup.get('typ') == 'sicherung' and len(backup['spielbrett']['categories']) == 5)
    check('Sicherung enthält eigene Spiele mit Bild', len(backup.get('eigeneSpiele', [])) == 1 and len(backup.get('bilder', {})) == 1)
    m.wait_for_timeout(200)
    check('Sicherung ohne selbst erstellte Sammlungsspiele', 'sammlung' not in backup)
    backup['sammlung'] = [{'name': 'Altes eigenes Spiel', 'kurz': 'x', 'alter': ['jugend'], 'ort': ['drinnen'], 'ablauf': ['x']}]
    json.dump(backup, open(path, 'w', encoding='utf-8'))
    check('Hinweis nach Sicherung weg', m.locator('#gmList .backup-note').count() == 0)
    m.locator('.mbtn', has_text='Vorlagen').click()
    m.locator('.ttools .btn', has_text='als Vorlage').click(); m.fill('#dInput', 'Testquiz'); m.click('#dYes'); m.wait_for_timeout(400)
    check('Nach Speichern wird Sicherung angeboten', 'Datei sichern' in m.inner_text('#dYes'))
    m.click('#dNo')
    check('eigene Vorlage gelistet', m.locator('.trow', has_text='Testquiz').count() == 1)
    m.locator('.trow', has_text='Testquiz').locator('.tdel').click(); m.click('#dYes'); m.wait_for_timeout(200)
    m.locator('.trow', has_text='Weihnachtsquiz').locator('.tdel').click(); m.click('#dYes'); m.wait_for_timeout(200)
    check('Löschen', m.locator('.trow', has_text='Testquiz').count() == 0 and m.locator('.trow', has_text='Weihnachtsquiz').count() == 0)
    m.set_input_files('#tplFile', path); m.wait_for_timeout(400)
    check('Sicherung einspielen (auch alte mit Sammlungsspielen)', m.locator('.trow', has_text='Gesichertes Spielbrett').count() == 1)
    m.locator('.ttools .btn', has_text='wiederherstellen').click(); m.wait_for_timeout(200)
    check('Standard-Vorlagen wiederherstellen', m.locator('.trow', has_text='Weihnachtsquiz').count() == 1)
    m.locator('.trow', has_text='Weihnachtsquiz').locator('.mbtn').click(); m.click('#dYes'); m.wait_for_timeout(400)
    check('Weihnachtsquiz laden', 'Weihnachtsgeschichte' in m.inner_text('#board'))
    os.remove(path)

    print('Update-Hinweis')
    m.evaluate("localStorage.setItem('grosserPreis_seenVersion','1.0.0')"); m.reload(); m.wait_for_timeout(1100)
    check('„Was ist neu“ nach Update gefüllt', m.locator('#clDialog.show').count() == 1 and m.locator('#clBody li').count() > 3)

    # Sicherheit: präparierte Gruppenfarbe beim Import wird verworfen
    m.evaluate(r"""(()=>{window.__xss=0;const d={categories:[{name:'K',items:[]}],points:[10],teams:[{name:'A',color:'#123456\\"><img src=x onerror=window.__xss=1>'},{name:'B',color:'#00ff00'}]};
      const n=normalize(d);window.__cols=n.teams.map(t=>t.color);})()""")
    cols = m.evaluate('window.__cols')
    check('Sicherheit: ungültige Gruppenfarbe wird ersetzt', cols[0].startswith('#') and len(cols[0]) == 7 and cols[1] == '#00ff00', cols)
    wf = open(os.path.join(ROOT, '.github/workflows/tests.yml'), encoding='utf-8').read()
    check('Sicherheit: Workflow standardmäßig nur lesen', 'permissions:\n  contents: read' in wf)
    check('Sicherheit: Content-Security-Policy gesetzt', 'Content-Security-Policy' in open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read())
    check('keine JavaScript-Fehler (auch keine CSP-Verstöße)', not errs, '; '.join(errs))
    b.close()

class FakeGitHub:
    """Nachgebautes GitHub (nur was der Editor braucht). Hält die Dateien im Speicher."""
    TOKEN = 'testtoken'
    def __init__(self, files):
        self.files = dict(files); self.commits = {}; self.trees = {}; self.n = 0
        self.head = self.new_commit(dict(self.files), None, 'Start')
        self.log = []
    def new_commit(self, files, parent, msg):
        self.n += 1; sha = hashlib.sha1(f'commit{self.n}'.encode()).hexdigest()
        self.commits[sha] = {'files': files, 'parent': parent, 'msg': msg}; return sha
    @staticmethod
    def blob(txt): return hashlib.sha1(txt.encode()).hexdigest()
    def handle(self, route, request):
        u = urlparse(request.url); path = unquote(u.path); q = parse_qs(u.query)
        js = lambda code, body: route.fulfill(status=code, content_type='application/json', body=json.dumps(body),
                                              headers={'Access-Control-Allow-Origin': '*'})
        if request.method == 'OPTIONS':
            return route.fulfill(status=204, headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*'})
        if request.headers.get('authorization') != 'Bearer ' + self.TOKEN: return js(401, {'message': 'Bad credentials'})
        base = '/repos/twoyears777/manna'
        if path == base: return js(200, {'full_name': 'twoyears777/manna'})
        rest = path[len(base):]
        ref = (q.get('ref') or ['main'])[0]
        files = self.commits[self.head if ref == 'main' else ref]['files'] if (ref == 'main' or ref in self.commits) else self.files
        if rest == '/contents/spiele':
            return js(200, [{'name': k.split('/')[-1], 'path': k, 'sha': self.blob(v), 'type': 'file'} for k, v in sorted(files.items())])
        if rest.startswith('/contents/'):
            k = rest[len('/contents/'):]
            if k not in files: return js(404, {'message': 'Not Found'})
            return js(200, {'path': k, 'sha': self.blob(files[k]), 'content': base64.b64encode(files[k].encode()).decode()})
        if rest == '/git/ref/heads/main': return js(200, {'object': {'sha': self.head}})
        if rest.startswith('/git/commits/') and request.method == 'GET': return js(200, {'tree': {'sha': 'tree-' + rest.split('/')[-1]}})
        body = json.loads(request.post_data or '{}')
        if rest == '/git/trees':
            f = dict(self.commits[body['base_tree'][5:]]['files'])
            for e in body['tree']:
                if e.get('sha', '') is None:
                    if e['path'] not in f: return js(422, {'message': 'path not found'})
                    del f[e['path']]
                else: f[e['path']] = e['content']
            t = 't' + str(len(self.trees)); self.trees[t] = f; return js(201, {'sha': t})
        if rest == '/git/commits':
            sha = self.new_commit(self.trees[body['tree']], body['parents'][0], body['message']); return js(201, {'sha': sha})
        if rest == '/git/refs/heads/main':
            c = self.commits[body['sha']]
            if c['parent'] != self.head: return js(422, {'message': 'Update is not a fast forward'})
            self.head = body['sha']; self.files = c['files']; self.log.append(c['msg']); return js(200, {})
        if rest == '/actions/runs':
            return js(200, {'workflow_runs': [{'status': 'in_progress', 'path': 'dynamic/pages/pages-build-deployment'}, {'status': 'completed', 'conclusion': 'success', 'html_url': 'https://example.org/run', 'path': '.github/workflows/tests.yml'}]})
        return js(404, {'message': 'Not Found: ' + rest})
    def change_elsewhere(self, k, txt):
        f = dict(self.files); f[k] = txt; self.head = self.new_commit(f, self.head, 'anderes Gerät'); self.files = f

def editor_checks(p):
    print('Editor')
    errs = []
    d = os.path.join(ROOT, 'tests', 'testspiele')
    gh = FakeGitHub({'spiele/' + f: open(os.path.join(d, f), encoding='utf-8').read() for f in os.listdir(d) if f.endswith('.txt')})
    b = p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, service_workers='block')
    ctx.route('https://api.github.com/**', gh.handle)
    e = ctx.new_page(); e.on('pageerror', lambda x: errs.append(str(x))); e.on('console', (lambda c: errs.append('CSP: ' + c.text) if 'Content Security Policy' in c.text else None))
    toast = lambda: e.inner_text('#toast')
    e.goto(EDITOR); e.wait_for_timeout(300)
    check('Editor: Anmeldung', e.locator('#vLogin:not([hidden])').count() == 1)
    e.fill('#inToken', 'falsch'); e.click('#btnLogin'); e.wait_for_timeout(300)
    check('Editor: falscher Schlüssel abgelehnt', 'ungültig' in e.inner_text('#loginMsg') and e.evaluate("localStorage.getItem('manna-editor-token')") is None)
    e.fill('#inToken', 'testtoken'); e.click('#btnLogin'); e.wait_for_timeout(600)
    names = e.locator('.game b').all_inner_texts()
    check('Editor: Spiele gelistet', names == ['Nachts in Palermo', 'Simon Says', 'Zeitungsschlagen'], names)
    e.reload(); e.wait_for_timeout(600)
    check('Editor: Schlüssel bleibt gespeichert', e.locator('#vList:not([hidden])').count() == 1)

    e.locator('.game', has_text='Palermo').click(); e.wait_for_timeout(200)
    check('Editor: Palermo vollständig im Formular', 'Kommissar' in e.input_value('#fRollen') and '8–10 | 2 | 1 | –' in e.input_value('#fTabelle') and e.input_value('#fMax') == '25')
    e.click('#btnPublish'); e.wait_for_timeout(300)
    check('Editor: unverändert ergibt dieselbe Datei', 'Keine Änderungen' in toast() and gh.log == [], toast())
    e.click('#btnBack'); e.wait_for_timeout(200)

    e.click('#btnNew'); e.wait_for_timeout(200)
    e.fill('#fName', 'Ochs am Berg'); e.click('#btnPublish'); e.wait_for_timeout(300)
    check('Editor: Pflichtfelder fehlen', 'Kurzbeschreibung' in toast() and 'Ablauf' in toast() and gh.log == [] and e.locator('[data-f="kurz"].bad').count() == 1)
    e.fill('#fKurz', 'Anschleichen,solange niemand hinschaut .')
    e.fill('#fAblauf', '- Eine Person steht an der Wand.\n2. Die anderen schleichen sich an.\n\nwer sich bewegt muss zurück')
    e.locator('#fOrt .chip', has_text='Draußen').click()
    e.locator('#fPhasen .chip', has_text='Anfangsphase').click()
    e.fill('#fRisiken', 'Nicht rennen, wenn der Boden rutschig ist.')
    check('Editor: Vorschau', 'Die anderen schleichen sich an.' in e.inner_text('#prevCard'))
    check('Editor: Felder „Pädagogische Gedanken“ und „Fragen zum Nachgespräch“', e.locator('#fPaed').count() == 1 and e.locator('#fNach').count() == 1)
    check('Editor: Vorschau setzt nur eigene Zeichen', e.locator('#prevCard ul li', has_text='Eine Person steht').count() == 1 and e.locator('#prevCard ol li', has_text='schleichen').count() == 1 and e.locator('#prevCard p', has_text='wer sich bewegt').count() == 1)
    e.click('#tabTxt'); check('Editor: Textdatei-Ansicht', e.inner_text('#prevTxt').startswith('MANNA-SPIEL v1')); e.click('#tabPrev')
    check('Editor: Entwurf gespeichert', 'Ochs am Berg' in (e.evaluate("localStorage.getItem('manna-editor-entwurf')") or ''))
    e.click('#btnPublish'); e.wait_for_timeout(800)
    txt = gh.files.get('spiele/ochs-am-berg.txt', '')
    check('Editor: neues Spiel als Textdatei veröffentlicht', gh.log == ['Neues Spiel: Ochs am Berg'] and txt == (
        'MANNA-SPIEL v1\nName: Ochs am Berg\nKurzbeschreibung: Anschleichen,solange niemand hinschaut .\nAlter: Jugendliche (13–17)\n'
        'Personen: ab 6\nOrt: drinnen, draußen\nDauer: -\nGruppenphasen: Anfangsphase\n\nMaterial:\n- keins\n\nAblauf:\n- Eine Person steht an der Wand.\n'
        '2. Die anderen schleichen sich an.\nwer sich bewegt muss zurück\n\nGefahren und Risiken:\nNicht rennen, wenn der Boden rutschig ist.\n'), txt)
    check('Editor: keine automatischen Aufzählungszeichen bei Gefahren', '\n- Nicht rennen' not in txt)
    check('Editor: Wortlaut unverändert (keine Korrekturen)', 'wer sich bewegt muss zurück' in txt and 'Anschleichen,solange' in txt)
    check('Editor: zurück in der Liste, Spiel ist online', e.locator('.game b', has_text='Ochs am Berg').count() == 1 and 'ist online' in e.inner_text('#notices'))
    check('Editor: Entwurf nach Veröffentlichen gelöscht', e.evaluate("localStorage.getItem('manna-editor-entwurf')") is None)
    r = build_text(txt)
    check('Editor: Datei besteht den Bau-Schritt', r.returncode == 0, r.stderr)

    e.click('#btnNew'); e.fill('#fName', 'simon says'); e.fill('#fKurz', 'x'); e.fill('#fAblauf', 'x'); e.click('#btnPublish'); e.wait_for_timeout(300)
    check('Editor: doppelter Name abgelehnt', 'gibt es schon' in toast() and len(gh.log) == 1, toast())
    e.click('#btnBack'); e.wait_for_timeout(200)
    check('Editor: Rückfrage bei ungespeicherten Änderungen', e.locator('#modal:not([hidden])').count() == 1)
    e.locator('#mBtns button', has_text='Entwurf verwerfen').click(); e.wait_for_timeout(200)

    e.locator('.game', has_text='Ochs am Berg').click(); e.wait_for_timeout(200)
    e.fill('#fName', 'Ochs am Berg (Variante)'); e.click('#btnPublish'); e.wait_for_timeout(800)
    check('Editor: umbenennen in einem Commit', len(gh.log) == 2 and 'spiele/ochs-am-berg-variante.txt' in gh.files and 'spiele/ochs-am-berg.txt' not in gh.files, gh.log)

    e.locator('.game', has_text='Zeitungsschlagen').click(); e.wait_for_timeout(200)
    gh.change_elsewhere('spiele/zeitungsschlagen.txt', gh.files['spiele/zeitungsschlagen.txt'].replace('ca. 10 Minuten', 'ca. 12 Minuten'))
    e.fill('#fDauer', 'ca. 15 Minuten'); e.click('#btnPublish'); e.wait_for_timeout(500)
    check('Editor: Warnung bei Änderung auf anderem Gerät', 'anderen Gerät geändert' in e.inner_text('#mMsg'))
    e.locator('#mBtns button', has_text='Abbrechen').click(); e.wait_for_timeout(300)
    check('Editor: abgebrochen, nichts überschrieben', 'ca. 12 Minuten' in gh.files['spiele/zeitungsschlagen.txt'] and len(gh.log) == 2)
    check('Editor: Entwurf bleibt', 'ca. 15 Minuten' in (e.evaluate("localStorage.getItem('manna-editor-entwurf')") or ''))
    e.click('#btnPublish'); e.wait_for_timeout(500)
    e.locator('#mBtns button', has_text='Trotzdem überschreiben').click(); e.wait_for_timeout(800)
    check('Editor: bewusst überschreiben', 'ca. 15 Minuten' in gh.files['spiele/zeitungsschlagen.txt'] and gh.log[-1] == 'Spiel überarbeitet: Zeitungsschlagen')

    e.locator('.game', has_text='Variante').click(); e.wait_for_timeout(200)
    e.click('#btnDelete'); e.wait_for_timeout(200)
    check('Editor: Löschen fragt nach', 'wirklich' in e.inner_text('#mMsg'))
    e.locator('#mBtns button', has_text='Löschen').click(); e.wait_for_timeout(800)
    check('Editor: Spiel gelöscht', 'spiele/ochs-am-berg-variante.txt' not in gh.files and gh.log[-1] == 'Spiel gelöscht: Ochs am Berg (Variante)' and e.locator('.game b', has_text='Variante').count() == 0)

    e.set_viewport_size({'width': 390, 'height': 844}); e.click('#btnNew'); e.wait_for_timeout(200)
    check('Editor: Handy ohne seitliches Scrollen', e.evaluate("document.documentElement.scrollWidth<=window.innerWidth"))
    e.click('#btnBack'); e.wait_for_timeout(200)
    e.click('#btnLogout'); e.locator('#mBtns button', has_text='Abmelden').click(); e.wait_for_timeout(200)
    check('Editor: Abmelden löscht den Schlüssel', e.evaluate("localStorage.getItem('manna-editor-token')") is None and e.locator('#vLogin:not([hidden])').count() == 1)
    check('Editor: keine JavaScript-Fehler (auch keine CSP-Verstöße)', not errs, '; '.join(errs))
    b.close()

def build_text(txt):
    with tempfile.TemporaryDirectory() as t:
        name = re.search(r'^Name: (.+)$', txt, re.M).group(1)
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower().replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')).strip('-')
        open(os.path.join(t, slug + '.txt'), 'w', encoding='utf-8').write(txt)
        return build(t, os.path.join(t, 'alle.json'))

def mobile_checks(p):
    print('Handy und Tablet')
    b = p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
    msg = 'Diese Funktion ist aktuell nur auf einem Laptop oder PC verfügbar.'
    geraete = {
        'iPhone': dict(p.devices['iPhone 13']),
        'iPad (meldet sich als Mac)': dict(viewport={'width': 1024, 'height': 1366}, has_touch=True, is_mobile=False,
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'),
        'Android-Tablet': dict(viewport={'width': 1280, 'height': 800}, has_touch=True,
            user_agent='Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'),
    }
    for name, opts in geraete.items():
        opts.pop('default_browser_type', None)
        ctx = b.new_context(**opts); m = ctx.new_page(); m.goto(URL); m.wait_for_timeout(400)
        if m.locator('#clDialog.show').count(): m.click('#clX')
        for card, screen in [('#gcShows', '#showsScreen')]:
            m.click(card); m.wait_for_timeout(200)
            ok = m.locator('#dialog.show').count() == 1 and m.inner_text('#dMsg') == msg and not m.locator('#dNo').is_visible()
            check(f'{name}: {card} zeigt Hinweis statt Start', ok and m.locator('#home.show').count() == 1 and m.locator(screen + '.show').count() == 0)
            m.click('#dYes'); m.wait_for_timeout(150)
        m.click('#gcColl'); m.wait_for_timeout(300)
        check(f'{name}: Spielesammlung bleibt nutzbar', m.locator('#collScreen.show').count() == 1)
        m.wait_for_timeout(300)
        box = m.evaluate("(()=>{const r=document.querySelector('#collTitle').getBoundingClientRect();return [r.left,r.right,innerWidth]})()")
        check(f'{name}: Überschrift „Spielesammlung“ passt in die Breite', box[0] >= 0 and box[1] <= box[2], box)
        ctx.close()
    b.close()

if __name__ == '__main__':
    httpd = serve()
    try:
        static_checks()
        spiele_checks()
        with sync_playwright() as p:
            browser_checks(p)
            mobile_checks(p)
            editor_checks(p)
    except Exception:
        traceback.print_exc(); results.append(('Testlauf ohne Absturz', False, ''))
    finally:
        httpd.shutdown()
    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)} von {len(results)} Prüfungen bestanden.')
    sys.exit(1 if failed else 0)
