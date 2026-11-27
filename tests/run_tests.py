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

# Die Gameshows sind in der App ausgeblendet (GAMESHOWS_AN in js/data.js). Für ihre Tests werden sie
# pro Browser-Kontext über den Test-Schalter im localStorage eingeschaltet.
def gameshows_an(ctx):
    ctx.add_init_script("try{localStorage.setItem('manna_gameshows','1')}catch(e){}")
    return ctx

def go(m, card):
    # Der große Preis, Eigenes Spiel und Countdown liegen unter „Gameshows“
    if m.locator('#home.show').count(): m.click('#gcShows'); m.wait_for_timeout(150)
    m.click(card)

def static_checks():
    print('Statische Prüfungen')
    emoji = re.compile('[\U0001F000-\U0001FAFF☀-⛿✀-➿️]')
    allowed = set('✕✓★')
    for f in ['index.html', 'rechtliches.html', 'css/app.css', 'js/kern.js', 'js/preis.js', 'js/system.js', 'js/menues.js', 'js/zuschauer.js', 'js/sammlung.js', 'js/countdown.js', 'js/eigenes-spiel.js', 'js/artikel.js', 'js/data.js', 'js/gameshow-vorlagen.js', 'js/spielformat.js', 'js/supabase.js', 'js/einreichen.js', 'js/konto.js', 'js/sync.js', 'js/konto-seite.js', 'js/daumen.js', 'js/klicks.js', 'editor/index.html', 'editor/editor.js', 'editor/editor.css']:
        txt = open(os.path.join(ROOT, f), encoding='utf-8').read()
        found = sorted(set(c for c in emoji.findall(txt) if c not in allowed))
        check(f'keine Emojis in {f}', not found, ''.join(found))
        check(f'keine Schreibmaschinen-/Handschrift in {f}', not re.search('Courier|Typewriter|Marker Felt|Comic Sans', txt))
    idx = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    check('keine offenen Text-Platzhalter in index.html', '[[' not in idx, ', '.join(re.findall(r'\[\[([^\]]+)\]\]', idx)))
    APP_JS = ['js/kern.js', 'js/preis.js', 'js/system.js', 'js/menues.js', 'js/zuschauer.js', 'js/sammlung.js', 'js/countdown.js', 'js/eigenes-spiel.js', 'js/artikel.js']
    appjs = ''.join(open(os.path.join(ROOT, f), encoding='utf-8').read() for f in APP_JS)
    check('keine offenen Text-Platzhalter im JavaScript', not re.search(r'\[\[[A-ZÄÖÜ][^\]\[]*\]\]', appjs), ', '.join(re.findall(r'\[\[([^\]]+)\]\]', appjs)))
    legal = open(os.path.join(ROOT, 'rechtliches.html'), encoding='utf-8').read()
    offen = len(re.findall(r'class="ph"|\[\[', legal))
    check('Rechtliches: alle Angaben eingetragen (kein „folgt“ mehr)', offen == 0, f'{offen} Stellen offen')
    check('Rechtliches: Name und Anschrift im Impressum', 'Lukas Harder' in legal and 'c/o Online-Impressum' in legal and '53757 Sankt Augustin' in legal)
    check('Rechtliches: Impressum nach § 5 DDG', '§ 5 DDG' in legal and 'id="impressum"' in legal)
    check('Rechtliches: Datenschutz und weitere Hinweise', 'id="datenschutz"' in legal and 'id="hinweise"' in legal)
    data = open(os.path.join(ROOT, 'js/data.js'), encoding='utf-8').read()
    sw = open(os.path.join(ROOT, 'sw.js'), encoding='utf-8').read()
    v1 = re.search(r"APP_VERSION='([\d.]+)'", data).group(1)
    v2 = re.search(r"const VERSION = '([\d.]+)'", sw).group(1)
    check('Version in data.js und sw.js gleich', v1 == v2, f'{v1} / {v2}')
    md = open(os.path.join(ROOT, 'CHANGELOG.md'), encoding='utf-8').read()
    check('CHANGELOG.md enthält aktuelle Version', f'## {v1}' in md)
    for f in ['rechtliches.html', 'css/app.css', 'js/spielformat.js', 'js/artikel.js', 'js/data.js', 'js/gameshow-vorlagen.js', 'js/kern.js', 'js/preis.js', 'js/system.js', 'js/menues.js', 'js/zuschauer.js', 'js/sammlung.js', 'js/countdown.js', 'js/eigenes-spiel.js', 'js/konto.js', 'js/sync.js', 'js/konto-seite.js']:
        check(f'Service Worker cached {f}', f"'./{f}'" in sw)
        check(f'Datei vorhanden: {f}', os.path.exists(os.path.join(ROOT, f)))
    # Jede Skriptdatei, die index.html lädt, muss der Service Worker kennen (sonst fehlt sie offline)
    fehlt = [f for f in re.findall(r'<script src="([^"]+)"', idx) if f"'./{f}'" not in sw]
    check('Service Worker cached alle Skripte aus index.html', not fehlt, ', '.join(fehlt))

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
    rd = os.path.join(ROOT, 'rohfassungen')
    if os.path.isdir(rd):
        with tempfile.TemporaryDirectory() as t:
            r = build(rd, os.path.join(t, 'alle.json'))
            check('Rohfassungen passen ins Spieleformat', r.returncode == 0, (r.stdout + r.stderr).strip()[:2000])
            roh = {x['name'].lower() for x in json.load(open(os.path.join(t, 'alle.json'), encoding='utf-8'))['spiele']} if r.returncode == 0 else set()
        live = {x['name'].lower() for x in json.load(open(os.path.join(ROOT, 'spiele', 'alle.json'), encoding='utf-8'))['spiele']}
        check('Rohfassungen nicht in der App', not (roh & live), sorted(roh & live))
        check('Rohfassung und Spiel haben nie denselben Dateinamen', not (set(os.listdir(rd)) & set(os.listdir(os.path.join(ROOT, 'spiele')))))
    wf = open(os.path.join(ROOT, '.github/workflows/tests.yml'), encoding='utf-8').read()
    check('Rohfassungen kommen nicht auf die Website', "--exclude 'rohfassungen'" in wf)

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
        ep:(()=>{const q=F.parse(t.replace('Dauer: -','Dauer: -\nErlebnispädagogik: ja'));return {f:q.fehler,ja:q.spiel.erlebnis===true,txt:F.serialize(q.spiel)};})(),
        epNein:'erlebnis' in p.spiel||'erlebnis' in F.parse(t.replace('Dauer: -','Dauer: -\nErlebnispädagogik: nein')).spiel,
        epErr:F.parse(t.replace('Dauer: -','Dauer: -\nErlebnispädagogik: vielleicht')).fehler,
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
    check('Format: Erlebnispädagogik lesen und schreiben', res['ep']['f'] == [] and res['ep']['ja'] and 'Dauer: -\nErlebnispädagogik: ja\n' in res['ep']['txt'], res['ep'])
    check('Format: ohne Angabe oder „nein“ kein Erlebnispädagogik', not res['epNein'])
    check('Format: unklare Angabe bei Erlebnispädagogik meldet Fehler', any('Erlebnispädagogik' in f for f in res['epErr']), res['epErr'])
    check('Format: Rollen-Tabelle', res['palermo'] == {'liste': [], 'tabelle': {'kopf': ['A', 'B'], 'zeilen': [['1', '2']]}}, res['palermo'])
    check('Format: Dateiname aus Namen', res['slug'] == 'aechz-uebung-gross', res['slug'])
    check('Format: Pflichtangaben werden geprüft', res['bad'] >= 5)

def browser_checks(p):
    errs = []
    b = p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
    ctx = gameshows_an(b.new_context(viewport={'width': 1280, 'height': 800}, accept_downloads=True))
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
    check('Pädagogischer Kram: Seite mit Artikel Gruppenphasen', m.locator('#paedScreen.show').count() == 1 and m.locator('#paedScreen .gcard .wbar').all_inner_texts() == ['Gruppenphasen', 'Vier-Ohren-Modell – die vier Ebenen der Kommunikation', 'Sicherheit', 'Erlebnispädagogik'], m.locator('#paedScreen .gcard .wbar').all_inner_texts())
    m.click('#artTiles [data-art="erlebnispaedagogik"]'); m.wait_for_timeout(200)
    check('Artikel Erlebnispädagogik: Platzhalter mit KI-Hinweis', m.locator('#artScreen.show').count() == 1 and m.locator('#artBody .ki-hinweis').count() == 1 and 'KI' in m.inner_text('#artBody .ki-hinweis'))
    m.click('#btnArtBack'); m.wait_for_timeout(150)
    m.click('#artTiles [data-art="vier-ohren"]'); m.wait_for_timeout(200)
    check('Artikel Vier-Ohren-Modell: vier Ebenen', m.locator('#artScreen.show').count() == 1 and m.locator('#artScreen .note h3').all_inner_texts() == ['Sachinhalt', 'Selbstoffenbarung', 'Beziehung', 'Appell'], m.locator('#artScreen .note h3').all_inner_texts())
    m.click('#artScreen .back-top'); m.wait_for_timeout(150)
    check('Vier-Ohren-Modell: zurück zu Pädagogischer Kram', m.locator('#paedScreen.show').count() == 1)
    m.click('#artTiles [data-art="sicherheit"]'); m.wait_for_timeout(200)
    check('Artikel Sicherheit: Abschnitt „Was tun im Notfall?“ mit Unterpunkten', m.locator('#artScreen .note h3').all_inner_texts() == ['Was tun im Notfall?'] and m.locator('#art-sicherheit-notfall h4').count() == 5 and m.locator('#art-sicherheit-notfall ul li').count() >= 6, m.locator('#artScreen .note h4').all_inner_texts())
    m.click('#btnArtBack'); m.wait_for_timeout(150)
    m.click('#artTiles [data-art="gruppenphasen"]'); m.wait_for_timeout(200)
    check('Artikel Gruppenphasen: fünf Phasen', m.locator('#artScreen .note h3').all_inner_texts() == ['Anfangsphase', 'Rollenfindungsphase', 'Vertrautheitsphase', 'Differenzierungsphase', 'Ablösungsphase'], m.locator('#artScreen .note h3').all_inner_texts())
    check('Artikel: zurück zu Pädagogischer Kram', m.inner_text('#btnArtBack') == '← Pädagogischer Kram')
    m.click('#btnArtBack'); m.wait_for_timeout(150); m.click('#paedScreen .back-top'); m.wait_for_timeout(150)
    check('Zurück-Knopf oben auf Unterseiten', m.locator('#home.show').count() == 1)
    check('Marke „Manna“ auf der Startseite', m.get_attribute('#homeBrand', 'aria-label') == 'Manna' and m.evaluate("document.querySelector('#homeBrand img').naturalWidth>0") and m.title() == 'Manna')
    m.locator('#gameCount').scroll_into_view_if_needed(); m.wait_for_timeout(1700)
    n_games = m.evaluate('GAMES.length')
    check('Zähler zeigt Anzahl der Spiele', n_games > 0 and m.inner_text('#gameCountNum') == str(n_games) and m.locator('#gameCount.leer').count() == 0, (m.inner_text('#gameCountNum'), n_games))
    m.evaluate('scrollTo(0,0)')
    heads = m.locator('#home .hblock h2').all_inner_texts()
    check('Bereiche auf der Startseite', heads == ['Wir wissen, was es in der Jugendarbeit braucht!', 'Was wollen wir?'], heads)
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
    check('Filtergruppen', m.locator('.flabel').all_inner_texts() == ['Alter', 'Personen', 'Gruppenphase', 'Ort', 'Material', 'Erlebnispädagogik', 'Favoriten'], m.locator('.flabel').all_inner_texts())
    m.locator('.f-erlebnis .fchip').click(); m.wait_for_timeout(80)
    check('Filter Erlebnispädagogik: nur passende Spiele', m.locator('.game-row .gname').all_inner_texts() == ['Nachts in Palermo'], m.locator('.game-row .gname').all_inner_texts())
    check('Spielübersicht: Label Erlebnispädagogik', m.locator('.game-row .gtag-ep').count() == 1 and m.inner_text('.game-row .gtag-ep') == 'Erlebnispädagogik')
    m.click('#btnFilterReset'); m.wait_for_timeout(80)
    check('Label Erlebnispädagogik nur bei passenden Spielen', m.locator('.game-row .gtag-ep').count() == 1)
    check('Gruppenphasen-Filter mit kurzen Namen', m.locator('.f-phase .fchip').all_inner_texts() == ['Anfang', 'Rollenfindung', 'Vertrautheit', 'Differenzierung', 'Ablösung'], m.locator('.f-phase .fchip').all_inner_texts())
    m.locator('.f-phase .fchip', has_text='Rollenfindung').click(); m.wait_for_timeout(80)
    check('Filter Rollenfindung: nur Spiele mit dieser Phase', m.locator('.game-row .gname').all_inner_texts() == ['Simon Says'], m.locator('.game-row .gname').all_inner_texts())
    m.locator('.f-phase .fchip', has_text='Anfang').click(); m.wait_for_timeout(80)
    check('Zwei Phasen: Spiele, die zu einer davon passen', m.locator('.game-row .gname').all_inner_texts() == ['Simon Says', 'Zeitungsschlagen'], m.locator('.game-row .gname').all_inner_texts())
    m.click('#btnFilterReset'); m.wait_for_timeout(80)
    box = m.evaluate("(()=>{const o=document.querySelector('.f-ort').getBoundingClientRect(),t=document.querySelector('.f-material').getBoundingClientRect();return [Math.round(o.top),Math.round(t.top)]})()")
    check('PC: Ort und Material teilen sich eine Zeile', abs(box[0] - box[1]) <= 8, box)
    box2 = m.evaluate("(()=>{const o=document.querySelector('.f-erlebnis').getBoundingClientRect(),t=document.querySelector('.f-fav').getBoundingClientRect();return [Math.round(o.top),Math.round(t.top)]})()")
    check('PC: Erlebnispädagogik und Favoriten teilen sich eine Zeile', abs(box2[0] - box2[1]) <= 8, box2)
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
    check('Gruppenphase führt zum Artikel', m.locator('#artScreen.show').count() == 1 and m.evaluate("(()=>{const r=document.querySelector('#art-gruppenphasen-vertraut').getBoundingClientRect();return r.top>=0&&r.top<innerHeight})()"))
    check('Artikel: zurück zum Spiel', m.inner_text('#btnArtBack') == '← Zurück zum Spiel' and m.inner_text('#artScreen .back-top') == '← Zurück zum Spiel')
    m.click('#artScreen .back-top'); m.wait_for_timeout(200)
    check('Zurück-Knopf oben führt zurück zum Spiel', m.locator('#gameScreen.show').count() == 1)
    m.click('#btnGameBack'); m.locator('.game-row', has_text='Simon Says').click(); m.wait_for_timeout(300)
    check('Alle fünf Phasen: ein Schild „Alle Gruppenphasen“', m.locator('#gameSheet .phase-chip').all_inner_texts() == ['Alle Gruppenphasen'], m.locator('#gameSheet .phase-chip').all_inner_texts())
    m.click('#btnGameBack'); m.locator('.game-row', has_text='Zeitungsschlagen').click(); m.wait_for_timeout(300)
    m.click('#btnGameBack'); m.locator('.game-row', has_text='Palermo').click(); m.wait_for_timeout(300)
    check('Palermo: Rollen mit Verteilungstabelle', m.locator('.role-table tbody tr').count() == 4 and 'Kommissar' in m.inner_text('#gameSheet'))
    check('Detailseite: Schild Erlebnispädagogik', m.locator('#gameSheet .ep-chip').all_inner_texts() == ['Erlebnispädagogik'], m.locator('#gameSheet .phase-chip').all_inner_texts())
    m.click('#gameSheet .ep-chip'); m.wait_for_timeout(300)
    check('Schild Erlebnispädagogik führt zum Artikel', m.locator('#artScreen.show').count() == 1 and m.locator('#artBody .ki-hinweis').count() == 1 and m.inner_text('#btnArtBack') == '← Zurück zum Spiel')
    m.click('#btnArtBack'); m.wait_for_timeout(200)
    check('Vom Artikel zurück zu Palermo', m.locator('#gameScreen.show').count() == 1 and 'Kommissar' in m.inner_text('#gameSheet'))
    check('Ohne Erlebnispädagogik kein Schild', m.evaluate("(()=>{openGame('simon-says');return document.querySelectorAll('#gameSheet .ep-chip').length})()") == 0)
    m.click('#btnGameBack'); m.wait_for_timeout(200)

    print('Suche')
    def suche(q):
        m.fill('#collSearch', q); m.wait_for_timeout(80)
        return m.locator('.game-row .gname').all_inner_texts()
    check('Suche: Feld vorhanden, Filter bleiben', m.locator('#collSearch').count() == 1 and m.locator('#filters .fchip').count() > 5)
    r = [suche('zeitung'), suche('Zeitung schlagen'), suche('simon-says')]
    check('Suche: Name, getrennt geschrieben, mit Bindestrich', r == [['Zeitungsschlagen']] * 2 + [['Simon Says']], r)
    check('Suche: Umlaute egal (ae, ö, o)', suche('Muelleimer') == ['Zeitungsschlagen'] and suche('Mulleimer') == ['Zeitungsschlagen'])
    check('Suche: Tippfehler findet ähnliche Spiele', suche('Palermmo') == ['Nachts in Palermo'] and 'ähnlich' in m.inner_text('#collCount'))
    r = suche('Klebeband')
    check('Suche: im Material gefunden, Fundstelle angezeigt und markiert', r == ['Zeitungsschlagen'] and 'Gefunden in Material' in m.inner_text('.gfund') and m.locator('.gfund mark').count() >= 1, m.locator('.gfund').all_inner_texts())
    r = suche('Nachts')
    check('Suche: Treffer im Namen stehen oben', r and r[0] == 'Nachts in Palermo' and m.locator('.game-row').first.locator('mark').count() >= 1, r)
    check('Suche: mehrere Wörter müssen alle passen', suche('Zeitung Mafia') == [])
    check('Suche: kein Treffer mit Hinweis', suche('xyzzy') == [] and 'Kein Spiel gefunden' in m.inner_text('#gameList'))
    m.keyboard.press('Escape'); m.wait_for_timeout(80)
    check('Suche: Esc leert das Feld und bleibt in der Spielesammlung', m.locator('#collScreen.show').count() == 1 and m.input_value('#collSearch') == '' and m.locator('.game-row').count() == len(m.evaluate('GAMES')))
    m.locator('.fchip', has_text='Ohne Material').click(); m.wait_for_timeout(80)
    suche('Mafia')
    check('Suche: von Filtern versteckte Treffer werden angeboten', m.locator('.games-hidden').count() == 1 and '1 weiterer Treffer' in m.inner_text('.games-hidden'), m.inner_text('#gameList'))
    m.locator('.games-hidden button').click(); m.wait_for_timeout(80)
    check('Suche: Filter zurücksetzen zeigt den Treffer', m.locator('.game-row .gname').all_inner_texts() == ['Nachts in Palermo'])
    m.click('#collSearchClear'); m.wait_for_timeout(80)
    check('Suche: ×-Knopf leert und behält den Fokus', m.input_value('#collSearch') == '' and m.evaluate("document.activeElement.id") == 'collSearch')
    m.evaluate("document.activeElement.blur()"); m.keyboard.press('/'); m.wait_for_timeout(50)
    check('Suche: „/“ springt ins Suchfeld', m.evaluate("document.activeElement.id") == 'collSearch' and m.input_value('#collSearch') == '')
    m.evaluate("document.activeElement.blur()")

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
    check('Dauerhafter Speicher wird angefragt', m.evaluate("typeof askPersist==='function'") and 'askPersist' in open(os.path.join(ROOT, 'js/sammlung.js'), encoding='utf-8').read())

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
    check('Nach einem Update geht kein Changelog-Fenster von selbst auf', m.locator('#clDialog.show').count() == 0)
    check('Alter Merker für „Was ist neu“ wird weggeräumt', m.evaluate("localStorage.getItem('grosserPreis_seenVersion')") is None)

    # Sicherheit: präparierte Gruppenfarbe beim Import wird verworfen
    m.evaluate(r"""(()=>{window.__xss=0;const d={categories:[{name:'K',items:[]}],points:[10],teams:[{name:'A',color:'#123456\\"><img src=x onerror=window.__xss=1>'},{name:'B',color:'#00ff00'}]};
      const n=normalize(d);window.__cols=n.teams.map(t=>t.color);})()""")
    cols = m.evaluate('window.__cols')
    check('Sicherheit: ungültige Gruppenfarbe wird ersetzt', cols[0].startswith('#') and len(cols[0]) == 7 and cols[1] == '#00ff00', cols)
    # Robustheit: kaputte oder übergroße Dateien
    r = m.evaluate("""(()=>{const out={};
      try{const n=normalize({categories:[null,{name:'K',items:[null,{type:'mc'}]}],points:[10,20],teams:Array.from({length:30},(_,i)=>({name:'T'+i+'x'.repeat(99)}))});
        out.ok=true;out.cats=n.categories.length;out.items=n.categories[0].items.length;out.teams=n.teams.length;out.name=n.teams[0].name.length;}catch(e){out.ok=false;out.err=String(e);}
      return out;})()""")
    check('Import: null-Einträge stürzen nicht ab', r.get('ok') and r.get('cats') == 1 and r.get('items') == 2, r)
    check('Import: Obergrenzen (8 Gruppen, Namenslänge)', r.get('teams') == 8 and r.get('name') == 30, r)
    m.evaluate("document.querySelectorAll('#dialog.show').forEach(d=>d.classList.remove('show'))")
    m.evaluate("doImport(JSON.stringify({categories:[null,{name:'Kaputt',items:[null]}]}))"); m.wait_for_timeout(200)
    check('Import: kaputte Datei fragt normal nach', m.locator('#dialog.show').count() == 1)
    m.evaluate("document.querySelector('#dialog').classList.remove('show')")
    t = m.evaluate("""(()=>{const t=S.teams.slice(),tu=S.turn;S.teams=[{id:'a',name:'A',color:'#111111',score:0},{id:'b',name:'B',color:'#222222',score:0},{id:'c',name:'C',color:'#333333',score:0}];S.turn=2;
      renderTeams();document.querySelectorAll('#sTeams .danger')[0].click();document.querySelector('#dYes').click();const r=S.teams[S.turn].name;S.teams=t;S.turn=tu;save();return r;})()""")
    check('Gruppe löschen: Zug bleibt bei derselben Gruppe', t == 'C', t)
    wf0 = open(os.path.join(ROOT, '.github/workflows/tests.yml'), encoding='utf-8').read()
    check('Stabilität: Playwright-Version fest', re.search(r'pip install playwright==\d', wf0) is not None)
    sw = open(os.path.join(ROOT, 'sw.js'), encoding='utf-8').read()
    check('Update: Version in sw.js passt zu APP_VERSION', f"VERSION = '{m.evaluate('APP_VERSION')}'" in sw)
    wf = open(os.path.join(ROOT, '.github/workflows/tests.yml'), encoding='utf-8').read()
    check('Sicherheit: Workflow standardmäßig nur lesen', 'permissions:\n  contents: read' in wf)
    check('Sicherheit: Content-Security-Policy gesetzt', 'Content-Security-Policy' in open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read())
    check('keine JavaScript-Fehler (auch keine CSP-Verstöße)', not errs, '; '.join(errs))
    b.close()

class FakeSupabase:
    """Nachgebautes Supabase (nur was App und Editor brauchen). Spielt die Zugriffsregeln der Datenbank nach:
    einreichen nur mit Konto und Username (die Datenbank setzt user_id und username selbst), mit Admin-Login lesen, ändern, löschen."""
    KEY = 'sb_publishable_XVvHrzG_pDKErkF37hsN4A_NYzt-Dc-'
    def __init__(self):
        self.rows = []; self.n = 0; self.voll = False; self.offline = False; self.posts = []
        self.nutzer = {'Bearer user-1': {'id': 'u-1', 'username': 'anna_jugend'}, 'Bearer user-noname': {'id': 'u-2', 'username': None}}
    def handle(self, route, request):
        u = urlparse(request.url); path = u.path; q = parse_qs(u.query)
        cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*'}
        js = lambda code, body: route.fulfill(status=code, content_type='application/json', body=json.dumps(body) if body is not None else '', headers=cors)
        if request.method == 'OPTIONS': return route.fulfill(status=204, headers=cors)
        if self.offline: return route.abort()
        h = request.headers
        if h.get('apikey') != self.KEY: return js(401, {'message': 'Invalid API key'})
        admin = h.get('authorization') in ('Bearer admin-1', 'Bearer admin-2')
        body = json.loads(request.post_data) if request.post_data else {}
        if path == '/auth/v1/token':
            g = q.get('grant_type', [''])[0]
            if g == 'password' and body.get('email') == 'kontakt@manna-games.de' and body.get('password') == 'Pw-7xQ!test':
                return js(200, {'access_token': 'admin-1', 'refresh_token': 'r1', 'expires_in': 3600})
            if g == 'refresh_token' and body.get('refresh_token') == 'r1':
                return js(200, {'access_token': 'admin-2', 'refresh_token': 'r1', 'expires_in': 3600})
            return js(400, {'error_description': 'Invalid login credentials'})
        if path == '/auth/v1/logout': return js(204, None)
        nutzer = self.nutzer.get(h.get('authorization'))
        if path == '/rest/v1/rpc/daumen_zahlen': return js(200, [])
        if path == '/rest/v1/daumen': return js(200, [])
        if path == '/rest/v1/profile':
            return js(200, [{'username': nutzer['username']}] if nutzer and nutzer['username'] else [])
        if path != '/rest/v1/einreichungen': return js(404, {'message': 'not found'})
        if request.method == 'POST':
            self.posts.append({'headers': dict(h), 'body': body})
            erlaubt = {'titel', 'spiel', 'rechte_bestaetigt'}
            if not nutzer: return js(401, {'message': 'permission denied'})
            if set(body) - erlaubt or body.get('rechte_bestaetigt') is not True: return js(403, {'message': 'permission denied'})
            if self.voll: return js(400, {'code': 'P0001', 'message': 'limit_erreicht'})
            if not nutzer['username']: return js(400, {'code': 'P0001', 'message': 'kein_username'})
            self.n += 1
            self.rows.append(dict(body, id=f'00000000-0000-0000-0000-{self.n:012d}', erstellt_am='2026-11-25T14:00:00Z', status='neu', user_id=nutzer['id'], username=nutzer['username'], name=None, email=None))
            return js(201, None)
        if not admin: return js(200, []) if request.method == 'GET' else js(401, {'message': 'JWT invalid'})
        rid = (q.get('id', [''])[0]).replace('eq.', '')
        if request.method == 'GET':
            return js(200, [r for r in self.rows if r['status'] == 'neu'])
        if request.method == 'PATCH':
            for r in self.rows:
                if r['id'] == rid: r.update(body)
            return js(204, None)
        if request.method == 'DELETE':
            self.rows = [r for r in self.rows if r['id'] != rid]; return js(204, None)
        return js(405, {'message': 'nope'})

def einreichen_checks(p):
    print('Spiel einreichen')
    errs = []
    sb = FakeSupabase()
    b = p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, service_workers='block')
    ctx.route('https://atdfiktajxmhjqrhwgbb.supabase.co/**', sb.handle)
    m = ctx.new_page(); m.on('pageerror', lambda e: errs.append(str(e))); m.on('console', (lambda c: errs.append('CSP: ' + c.text) if 'Content Security Policy' in c.text else None))
    m.goto(URL); m.wait_for_timeout(400)
    if m.locator('#clDialog.show').count(): m.click('#clX')
    m.click('#gcColl'); m.wait_for_timeout(300)
    check('Einreichen: Knopf in der Spielesammlung', m.inner_text('#btnSubmitOpen') == 'Selbst ein Spiel einreichen')
    m.click('#btnSubmitOpen'); m.wait_for_timeout(300)
    check('Einreichen ohne Konto: Hinweis statt Formular', m.locator('#subGate:not([hidden])').count() == 1 and m.locator('#subForm[hidden]').count() == 1 and 'Konto' in m.inner_text('#subGateText'))
    m.click('#btnSubGate'); m.wait_for_timeout(300)
    check('Einreichen ohne Konto: „Anmelden“ führt zum Konto', m.locator('#kontoScreen.show').count() == 1)
    m.click('#btnKontoBack'); m.wait_for_timeout(300)
    check('Einreichen ohne Konto: zurück landet wieder beim Einreichen', m.locator('#submitScreen.show').count() == 1)
    konto = lambda token, uid: m.evaluate("([t,u])=>{localStorage.setItem('manna_konto',JSON.stringify({access:t,refresh:'rr',exp:Math.floor(Date.now()/1000)+3600,id:u,email:u+'@example.org'}));}", [token, uid])
    konto('user-noname', 'u-2'); m.reload(); m.wait_for_timeout(500)
    if m.locator('#clDialog.show').count(): m.click('#clX')
    m.click('#gcColl'); m.wait_for_timeout(200); m.click('#btnSubmitOpen'); m.wait_for_timeout(300)
    check('Einreichen ohne Username: Formular da, kein „Du reichst ein als“', m.locator('#subForm:not([hidden])').count() == 1 and m.inner_text('#subVon') == '')
    m.fill('#sName', 'X'); m.fill('#sKurz', 'Y'); m.fill('#sAblauf', 'Z'); m.check('#sRechte'); m.evaluate('subOpened=Date.now()-10000')
    m.click('#btnSubmitSend'); m.wait_for_timeout(300)
    check('Einreichen ohne Username: Bitte, erst einen festzulegen, nichts geschickt', m.locator('#dialog.show').count() == 1 and 'Username' in m.inner_text('#dMsg') and not sb.posts)
    m.click('#dYes'); m.wait_for_timeout(300)
    check('Einreichen ohne Username: führt zum Konto', m.locator('#kontoScreen.show').count() == 1)
    konto('user-1', 'u-1'); m.reload(); m.wait_for_timeout(500)
    if m.locator('#clDialog.show').count(): m.click('#clX')
    m.click('#gcColl'); m.wait_for_timeout(200); m.click('#btnSubmitOpen'); m.wait_for_timeout(300)
    check('Einreichen: Formular öffnet sich', m.locator('#submitScreen.show').count() == 1 and m.get_attribute('#submitTitle', 'aria-label') == 'Hilf uns beim Content!')
    check('Einreichen: zeigt „Du reichst ein als @anna_jugend“', '@anna_jugend' in m.inner_text('#subVon') and m.locator('#subGate[hidden]').count() == 1)
    check('Einreichen: keine Felder mehr für Name und E-Mail', m.locator('#sVon, #sMail').count() == 0)
    m.click('#btnSubmitSend'); m.wait_for_timeout(200)
    check('Einreichen: Pflichtfelder und Häkchen werden verlangt', 'Name' in m.inner_text('#subMsg') and 'Häkchen' in m.inner_text('#subMsg') and not sb.posts)
    m.fill('#sName', 'Wäscheklammern klauen'); m.fill('#sKurz', 'Alle  jagen\nKlammern.'); m.fill('#sAblauf', '- Jeder bekommt Klammern\n- Los geht’s')
    m.fill('#sMin', '8'); m.click('#sAlter .fchip >> nth=1'); m.click('#sOrt .fchip >> nth=0'); m.fill('#sRisiken', 'Nicht an Haaren ziehen')
    m.check('#sRechte')
    m.evaluate('subOpened=Date.now()'); m.click('#btnSubmitSend'); m.wait_for_timeout(300)
    check('Einreichen: zu schnelles Absenden gilt als Bot, nichts wird geschickt', not sb.posts and m.locator('#subDone:not([hidden])').count() == 1)
    m.click('#btnSubmitBack'); m.click('#btnSubmitOpen'); m.wait_for_timeout(200)
    check('Einreichen: Formular nach dem Absenden wieder leer', m.input_value('#sName') == '' and not m.is_checked('#sRechte'))
    def ausfuellen():
        m.fill('#sName', 'Wäscheklammern klauen'); m.fill('#sKurz', 'Alle jagen Klammern.'); m.fill('#sAblauf', '- Jeder bekommt Klammern\n- Los geht’s')
        m.fill('#sMin', '8'); m.click('#sAlter .fchip >> nth=1'); m.click('#sOrt .fchip >> nth=0'); m.fill('#sRisiken', 'Nicht an Haaren ziehen')
        m.check('#sRechte'); m.evaluate('subOpened=Date.now()-10000')
    ausfuellen(); m.fill('#sWebsite', 'http://spam.example'); m.click('#btnSubmitSend'); m.wait_for_timeout(300)
    check('Einreichen: verstecktes Bot-Feld ausgefüllt, nichts wird geschickt', not sb.posts)
    m.click('#btnSubmitBack'); m.click('#btnSubmitOpen'); m.wait_for_timeout(200)
    sb.voll = True; ausfuellen(); m.click('#btnSubmitSend'); m.wait_for_timeout(400)
    check('Einreichen: Fehlermeldung, wenn die Datenbank bremst', 'später erneut' in m.inner_text('#subMsg') and m.input_value('#sName') == 'Wäscheklammern klauen')
    sb.voll = False; m.click('#btnSubmitSend'); m.wait_for_timeout(400)
    post = sb.posts[-1] if sb.posts else {'headers': {}, 'body': {}}
    check('Einreichen: landet in der Datenbank', len(sb.rows) == 1 and m.locator('#subDone:not([hidden])').count() == 1)
    check('Einreichen: mit Anmeldung, ohne Konto/Username im Inhalt (setzt die Datenbank)', post['headers'].get('apikey') == sb.KEY and post['headers'].get('authorization') == 'Bearer user-1' and not {'user_id', 'username', 'name', 'email'} & set(post['body']))
    check('Einreichen: merkt sich „eingereicht von“', sb.rows and sb.rows[-1].get('username') == 'anna_jugend' and sb.rows[-1].get('user_id') == 'u-1')
    w = post['body'].get('spiel', {}).get('werte', {})
    check('Einreichen: Werte im Editor-Format', post['body'].get('titel') == 'Wäscheklammern klauen' and w.get('alter') == ['jugend'] and w.get('ort') == ['drinnen'] and w.get('min') == '8', post['body'])
    check('Einreichen: Danke-Text', 'Liebe geht raus! <3' in m.inner_text('#subDone'))
    sb.offline = True; m.click('#btnSubmitBack'); m.click('#btnSubmitOpen'); ausfuellen(); m.click('#btnSubmitSend'); m.wait_for_timeout(400)
    check('Einreichen: eigene Meldung ohne Internet', 'offline' in m.inner_text('#subMsg') and 'zu viele' not in m.inner_text('#subMsg') and m.input_value('#sName') != '')
    sb.offline = False
    m.set_viewport_size({'width': 390, 'height': 844}); m.wait_for_timeout(200)
    check('Einreichen: Handy ohne seitliches Scrollen', not m.evaluate('document.documentElement.scrollWidth > innerWidth'))
    check('Einreichen: keine JavaScript-Fehler (auch keine CSP-Verstöße)', not errs, '; '.join(errs))
    ctx.close()

    print('Editor: Eingereicht')
    errs = []
    sb.rows.append({'id': '00000000-0000-0000-0000-000000000099', 'erstellt_am': '2026-11-25T15:00:00Z', 'status': 'neu', 'titel': '<img src=x onerror=window.__xss=1>', 'name': '<b>Böse</b>', 'email': None, 'rechte_bestaetigt': True,
                    'spiel': {'format': 'manna-einreichung-1', 'werte': {'name': '<img src=x onerror=window.__xss=1>', 'kurz': '<script>window.__xss=1</script>', 'alter': ['jugend', 'hacker'], 'ort': 'drinnen', 'min': '1e9', 'ablauf': 'x' * 9000}}})
    d = os.path.join(ROOT, 'tests', 'testspiele')
    gh = FakeGitHub({'spiele/' + f: open(os.path.join(d, f), encoding='utf-8').read() for f in os.listdir(d) if f.endswith('.txt')})
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, service_workers='block')
    ctx.route('https://api.github.com/**', gh.handle); ctx.route('https://atdfiktajxmhjqrhwgbb.supabase.co/**', sb.handle)
    e = ctx.new_page(); e.on('pageerror', lambda x: errs.append(str(x))); e.on('console', (lambda c: errs.append('CSP: ' + c.text) if 'Content Security Policy' in c.text else None))
    e.goto(EDITOR); e.wait_for_timeout(300); e.fill('#inToken', 'testtoken'); e.click('#btnLogin'); e.wait_for_timeout(700)
    check('Eingereicht: Anmeldung bei Supabase wird angeboten', e.locator('#einrLogin:not([hidden])').count() == 1)
    e.fill('#inSbMail', 'kontakt@manna-games.de'); e.fill('#inSbPass', 'falsch'); e.click('#btnSbLogin'); e.wait_for_timeout(300)
    check('Eingereicht: falsches Passwort abgelehnt', 'stimmt nicht' in e.inner_text('#sbMsg') and e.evaluate("localStorage.getItem('manna-editor-supabase')") is None)
    e.fill('#inSbPass', 'Pw-7xQ!test'); e.click('#btnSbLogin'); e.wait_for_timeout(500)
    titel = e.locator('.einr-item b').all_inner_texts()
    check('Eingereicht: Liste nach Anmeldung', titel[0] == 'Wäscheklammern klauen' and len(titel) == 2 and e.inner_text('#einrCount') == '2', titel)
    check('Eingereicht: Passwort wird nicht gespeichert', 'Pw-7xQ!test' not in (e.evaluate("JSON.stringify(localStorage)") or ''))
    check('Sicherheit: Einreichungen werden nur als Text angezeigt', e.evaluate('window.__xss') is None and e.locator('.einr-item img, .einr-item script, .einr-item .von b').count() == 0)
    e.locator('.einr-item').nth(1).locator('.primary').click(); e.wait_for_timeout(300)
    check('Sicherheit: fremde Werte begrenzt und gefiltert', e.evaluate('window.__xss') is None and len(e.input_value('#fAblauf')) <= 4000 and e.input_value('#fMin') == '' and
          e.locator('#fAlter .chip.on').count() == 1 and e.locator('#fOrt .chip.on').count() == 0 and e.locator('#prevCard img').count() == 0)
    e.click('#btnBack'); e.wait_for_timeout(200)
    e.locator('.einr-item').nth(0).locator('.primary').click(); e.wait_for_timeout(300)
    check('Übernehmen: Formular mit den eingereichten Werten', e.input_value('#fName') == 'Wäscheklammern klauen' and e.input_value('#fMin') == '8' and e.inner_text('#editTitle') == 'Einreichung übernehmen')
    check('Übernehmen: zeigt, von wem es kommt', 'von @anna_jugend' in e.inner_text('#einrInfo'))
    e.fill('#fTipp', 'Klammern vorher zählen.'); e.click('#btnBack'); e.wait_for_timeout(200)
    e.locator('#mBtns button', has_text='Zur Liste').click(); e.wait_for_timeout(200)
    e.locator('.einr-item').nth(0).locator('.primary').click(); e.wait_for_timeout(300)
    check('Übernehmen: Entwurf gehört zur Einreichung', e.locator('#draftBox:not([hidden])').count() == 1 and 'anna_jugend' in e.inner_text('#einrInfo'))
    e.click('#dRestore'); e.wait_for_timeout(200)
    check('Übernehmen: Entwurf wiederhergestellt', e.input_value('#fTipp') == 'Klammern vorher zählen.')
    e.click('#btnRoh'); e.wait_for_timeout(800)
    check('Übernehmen: als Rohfassung gespeichert', 'rohfassungen/waescheklammern-klauen.txt' in gh.files and 'Nicht an Haaren ziehen' in gh.files.get('rohfassungen/waescheklammern-klauen.txt', ''))
    check('Übernehmen: Einreichung gelöscht (Datenschutz) und aus der Liste', not [r for r in sb.rows if r['titel'] == 'Wäscheklammern klauen'] and e.locator('.einr-item').count() == 1)
    check('Übernehmen: Entwurf der Einreichung danach weg', 'Klammern vorher' not in (e.evaluate("localStorage.getItem('manna-editor-entwurf')") or ''))
    e.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('manna-editor-supabase'));s.exp=1;localStorage.setItem('manna-editor-supabase',JSON.stringify(s));})()")
    e.reload(); e.wait_for_timeout(800)
    check('Eingereicht: abgelaufene Anmeldung wird erneuert', e.locator('.einr-item').count() == 1 and 'admin-2' in e.evaluate("localStorage.getItem('manna-editor-supabase')"))
    e.locator('.einr-item').nth(0).locator('.btn').click(); e.wait_for_timeout(200); e.click('#mBtns .danger'); e.wait_for_timeout(500)
    check('Ablehnen: Einreichung gelöscht', not any(r['id'].endswith('99') for r in sb.rows) and 'Gerade nichts Neues' in e.inner_text('#einrList'))
    e.click('#btnSbLogout'); e.wait_for_timeout(200)
    check('Eingereicht: Abmelden löscht die Anmeldung', e.evaluate("localStorage.getItem('manna-editor-supabase')") is None and e.locator('#einrLogin:not([hidden])').count() == 1)
    check('Eingereicht: keine JavaScript-Fehler (auch keine CSP-Verstöße)', not errs, '; '.join(errs))
    b.close()

class FakeGitHub:
    """Nachgebautes GitHub (nur was der Editor braucht). Hält die Dateien im Speicher."""
    TOKEN = 'testtoken'
    def __init__(self, files):
        self.files = dict(files); self.commits = {}; self.trees = {}; self.n = 0
        self.head = self.new_commit(dict(self.files), None, 'Start')
        self.log = []; self.reads = 0
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
        if rest in ('/contents/spiele', '/contents/rohfassungen'):
            d = rest[len('/contents/'):] + '/'
            hits = [{'name': k.split('/')[-1], 'path': k, 'sha': self.blob(v), 'type': 'file'} for k, v in sorted(files.items()) if k.startswith(d)]
            return js(200, hits) if hits else js(404, {'message': 'Not Found'})
        if rest.startswith('/contents/'):
            k = rest[len('/contents/'):]
            if k not in files: return js(404, {'message': 'Not Found'})
            self.reads += 1
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
    check('Editor: lädt beim zweiten Öffnen nichts neu, was sich nicht geändert hat', gh.reads == 3, gh.reads)
    alt = gh.files['spiele/simon-says.txt']
    gh.change_elsewhere('spiele/simon-says.txt', alt.replace('Kurzbeschreibung: ', 'Kurzbeschreibung: GEÄNDERT '))
    e.reload(); e.wait_for_timeout(600)
    check('Editor: geänderte Datei wird neu geladen', gh.reads == 4 and 'GEÄNDERT' in e.inner_text('#gameList'), gh.reads)
    gh.change_elsewhere('spiele/simon-says.txt', alt); e.reload(); e.wait_for_timeout(600)

    e.locator('.game', has_text='Palermo').click(); e.wait_for_timeout(200)
    check('Editor: Palermo vollständig im Formular', 'Kommissar' in e.input_value('#fRollen') and '8–10 | 2 | 1 | –' in e.input_value('#fTabelle') and e.input_value('#fMax') == '25')
    check('Editor: Erlebnispädagogik ist ausgewählt', e.locator('#fErlebnis .chip.on').count() == 1 and 'Erlebnispädagogik' in e.inner_text('#prevCard'))
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
    e.locator('#fErlebnis .chip').click()
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
        'Personen: ab 6\nOrt: drinnen, draußen\nDauer: -\nGruppenphasen: Anfangsphase\nErlebnispädagogik: ja\n\nMaterial:\n- keins\n\nAblauf:\n- Eine Person steht an der Wand.\n'
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
    e.click('#btnBack'); e.wait_for_timeout(200); e.locator('#mBtns button', has_text='Zur Liste').click(); e.wait_for_timeout(200)
    e.locator('.game', has_text='Simon').click(); e.wait_for_timeout(200)
    e.fill('#fDauer', 'ca. 3 Minuten'); e.click('#btnBack'); e.wait_for_timeout(200); e.locator('#mBtns button', has_text='Zur Liste').click(); e.wait_for_timeout(200)
    d = e.evaluate("localStorage.getItem('manna-editor-entwurf')") or ''
    check('Editor: Entwürfe je Spiel getrennt (kein Überschreiben)', 'ca. 15 Minuten' in d and 'ca. 3 Minuten' in d, d[:200])
    e.locator('.game', has_text='Zeitungsschlagen').click(); e.wait_for_timeout(200)
    check('Editor: Entwurf beim richtigen Spiel angeboten', e.locator('#draftBox:not([hidden])').count() == 1)
    e.click('#dRestore'); e.wait_for_timeout(200)
    e.click('#btnPublish'); e.wait_for_timeout(500)
    e.locator('#mBtns button', has_text='Trotzdem überschreiben').click(); e.wait_for_timeout(800)
    check('Editor: bewusst überschreiben', 'ca. 15 Minuten' in gh.files['spiele/zeitungsschlagen.txt'] and gh.log[-1] == 'Spiel überarbeitet: Zeitungsschlagen')

    e.locator('.game', has_text='Variante').click(); e.wait_for_timeout(200)
    e.click('#btnDelete'); e.wait_for_timeout(200)
    check('Editor: Löschen fragt nach', 'wirklich' in e.inner_text('#mMsg'))
    e.locator('#mBtns button', has_text='Löschen').click(); e.wait_for_timeout(800)
    check('Editor: Spiel gelöscht', 'spiele/ochs-am-berg-variante.txt' not in gh.files and gh.log[-1] == 'Spiel gelöscht: Ochs am Berg (Variante)' and e.locator('.game b', has_text='Variante').count() == 0)

    # Rohfassungen: nur im Editor, erst „Veröffentlichen“ bringt sie in die App
    roh = open(os.path.join(ROOT, 'tests', 'testspiele', 'simon-says.txt'), encoding='utf-8').read().replace('Name: Simon Says', 'Name: Rohes Spiel')
    gh.change_elsewhere('rohfassungen/rohes-spiel.txt', roh)
    e.reload(); e.wait_for_timeout(700)
    check('Editor: Rohfassung markiert in der Liste', e.locator('.game.roh b', has_text='Rohes Spiel').count() == 1 and e.locator('.game.roh .tag').count() == 1)
    check('Editor: Zähler nennt Rohfassungen', '1 Rohfassung' in e.inner_text('#listCount'), e.inner_text('#listCount'))
    e.select_option('#inArt', 'roh'); e.wait_for_timeout(100)
    check('Editor: Filter „Nur Rohfassungen“', e.locator('.game').count() == 1 and e.locator('.game.roh', has_text='Rohes Spiel').count() == 1, e.locator('.game b').all_inner_texts())
    e.select_option('#inArt', 'live'); e.wait_for_timeout(100)
    check('Editor: Filter „Nur veröffentlichte“', e.locator('.game.roh').count() == 0 and e.locator('.game').count() >= 2)
    e.select_option('#inArt', 'alle'); e.wait_for_timeout(100)
    e.locator('.game', has_text='Rohes Spiel').click(); e.wait_for_timeout(200)
    check('Editor: Rohfassung zeigt Hinweis und beide Knöpfe', e.is_visible('#rohInfo') and e.is_visible('#btnRoh') and e.is_visible('#btnPublish'))
    n = len(gh.log)
    e.fill('#fTipp', 'Geht auch zu zweit.'); e.click('#btnRoh'); e.wait_for_timeout(800)
    check('Editor: Rohfassung speichern bleibt im Ordner rohfassungen', len(gh.log) == n + 1 and gh.log[-1] == 'Rohfassung überarbeitet: Rohes Spiel'
          and 'Geht auch zu zweit.' in gh.files['rohfassungen/rohes-spiel.txt'] and 'spiele/rohes-spiel.txt' not in gh.files, gh.log)
    check('Editor: Rohfassung speichern meldet nichts als veröffentlicht', 'Rohfassung' in toast() and 'Rohes Spiel' not in e.inner_text('#notices'), toast())
    e.locator('.game', has_text='Rohes Spiel').click(); e.wait_for_timeout(200)
    e.click('#btnPublish'); e.wait_for_timeout(800)
    check('Editor: Rohfassung veröffentlichen verschiebt nach spiele/ in einem Commit', len(gh.log) == n + 2 and gh.log[-1] == 'Neues Spiel aus Rohfassung: Rohes Spiel'
          and 'spiele/rohes-spiel.txt' in gh.files and 'rohfassungen/rohes-spiel.txt' not in gh.files, gh.log)
    check('Editor: veröffentlichtes Spiel ohne Rohfassungs-Knopf', (e.locator('.game', has_text='Rohes Spiel').click() or e.wait_for_timeout(200) or True) and not e.is_visible('#btnRoh') and not e.is_visible('#rohInfo'))
    e.click('#btnBack'); e.wait_for_timeout(200)
    e.click('#btnNew'); e.wait_for_timeout(200)
    e.fill('#fName', 'Simon Says'); e.click('#btnRoh'); e.wait_for_timeout(300)
    check('Editor: neue Rohfassung mit vorhandenem Namen abgelehnt', len(gh.log) == n + 2)
    e.fill('#fName', 'Ganz neu'); e.fill('#fKurz', 'Kurz.'); e.fill('#fAblauf', 'Los geht es.'); e.click('#btnRoh'); e.wait_for_timeout(800)
    check('Editor: neues Spiel direkt als Rohfassung', gh.log[-1] == 'Neue Rohfassung: Ganz neu' and 'rohfassungen/ganz-neu.txt' in gh.files, gh.log)
    gh.change_elsewhere('rohfassungen/nachts-in-palermo.txt', gh.files['spiele/simon-says.txt'].replace('Simon Says', 'Nachts in Palermo'))
    e.locator('.game', has_text='Ganz neu').click(); e.wait_for_timeout(200)
    e.fill('#fName', 'Nachts in Palermo'); e.click('#btnRoh'); e.wait_for_timeout(500)
    check('Editor: Namensprüfung beim Speichern über beide Ordner', 'gibt es' in toast() and 'rohfassungen/ganz-neu.txt' in gh.files, toast())
    e.click('#btnBack'); e.locator('#mBtns button', has_text='Entwurf verwerfen').click(); e.wait_for_timeout(200)

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

def gameshows_aus_checks(p):
    print('Gameshows ausgeblendet')
    errs = []
    b = p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block')
    m = ctx.new_page(); m.on('pageerror', lambda e: errs.append(str(e)))
    m.goto(URL); m.wait_for_timeout(400)
    if m.locator('#clDialog.show').count(): m.click('#clX')
    check('Aus: Startseite nur Spielesammlung und Pädagogischer Kram', [t for t, v in zip(m.locator('#home .gcard .wbar').all_inner_texts(), [m.locator('#home .gcard').nth(i).is_visible() for i in range(m.locator('#home .gcard').count())]) if v] == ['Spielesammlung', 'Pädagogischer Kram'])
    check('Aus: Kachel „Fertige Gameshows“ unter „Wir wissen, was es braucht“ ausgeblendet', not m.locator('#perkShows').is_visible() and m.locator('#needTitle').count() == 1)
    check('Aus: Code ist noch da (Seiten vorhanden)', m.locator('#showsScreen').count() == 1 and m.locator('#gmenu').count() == 1 and m.locator('#timerScreen').count() == 1 and m.locator('#ownScreen').count() == 1)
    for n in ['shows', 'gmenu', 'board', 'timer', 'own', 'ownplay']:
        m.evaluate(f"showScreen('{n}')"); m.wait_for_timeout(50)
        check(f'Aus: Seite „{n}“ führt zur Startseite', m.locator('#home.show').count() == 1 and m.evaluate('screenName') == 'home')
    m.click('#gcColl'); m.wait_for_timeout(300)
    check('Aus: Spielesammlung geht', m.locator('#collScreen.show').count() == 1)
    m.click('#btnCollBack'); m.wait_for_timeout(150); m.click('#gcPaed'); m.wait_for_timeout(200)
    check('Aus: Pädagogischer Kram geht', m.locator('#paedScreen.show').count() == 1)
    m.evaluate("localStorage.setItem('manna_gameshows','1')"); m.reload(); m.wait_for_timeout(400)
    if m.locator('#clDialog.show').count(): m.click('#clX')
    check('Test-Schalter: Gameshows wieder sichtbar', m.locator('#gcShows').is_visible() and m.locator('#perkShows').is_visible())
    check('Gameshows aus: keine JavaScript-Fehler', not errs, errs)
    b.close()

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
        ctx = gameshows_an(b.new_context(**opts)); m = ctx.new_page(); m.goto(URL); m.wait_for_timeout(400)
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
        if name == 'iPhone':
            check('iPhone: Filter eingeklappt, Suchfeld oben', not m.locator('#filters').is_visible() and m.locator('#btnFilterToggle').is_visible() and m.locator('#collSearch').is_visible())
            m.fill('#collSearch', 'Mafia'); m.wait_for_timeout(100)
            top = m.evaluate("document.querySelector('.game-row').getBoundingClientRect().top")
            check('iPhone: Treffer direkt unter dem Suchfeld sichtbar', top < 500, top)
            m.click('#btnFilterToggle'); m.wait_for_timeout(100)
            check('iPhone: Knopf „Filter“ klappt die Filter auf', m.locator('#filters').is_visible())
            check('iPhone: kurzer Platzhalter im Suchfeld', m.get_attribute('#collSearch', 'placeholder') == 'Spiel suchen')
        ctx.close()
    b.close()

class FakeSupabaseKonten:
    """Nachgebautes Supabase für Konten & Sync. Spielt die Zugriffsregeln nach: Jeder sieht nur seine eigenen Zeilen.
    Zugangsschlüssel sind 'tok-<nutzer>-<n>', abgelaufene Schlüssel werden mit 401 abgelehnt."""
    KEY = 'sb_publishable_XVvHrzG_pDKErkF37hsN4A_NYzt-Dc-'
    def __init__(self):
        self.users = {}; self.tokens = {}; self.refresh = {}; self.n = 0; self.t = 0
        self.eintraege = {}; self.bilder = {}; self.profile = {}; self.daumen = set(); self.klicks = {}; self.offline = False; self.log = []; self.abgelaufen = set(); self.mails = []
        self.codes = {}; self.code_n = 0   # (mail, typ) -> zuletzt verschickter Code
    def neuer_code(self, mail, typ):
        self.code_n += 1; c = f'{123450 + self.code_n}'; self.codes[(mail, typ)] = c; return c
    def nutzer(self, mail, pw, bestaetigt=True):
        uid = f'00000000-0000-4000-8000-{len(self.users) + 1:012d}'
        self.users[mail] = {'id': uid, 'pw': pw, 'ok': bestaetigt, 'meta': {}}; return uid
    def zeit(self):
        self.t += 1; return f'2026-11-26T12:{self.t // 60:02d}:{self.t % 60:02d}.{self.t:06d}+00:00'
    def sitzung(self, mail):
        self.n += 1; u = self.users[mail]
        tok = f'tok-{u["id"][-4:]}-{self.n}'; ref = f'ref-{u["id"][-4:]}-{self.n}'
        self.tokens[tok] = u['id']; self.refresh[ref] = mail
        return {'access_token': tok, 'refresh_token': ref, 'expires_in': 3600, 'user': {'id': u['id'], 'email': mail, 'user_metadata': u['meta']}}
    def handle(self, route, request):
        u = urlparse(request.url); path = u.path; q = parse_qs(u.query)
        cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*'}
        js = lambda code, body: route.fulfill(status=code, content_type='application/json', body=json.dumps(body) if body is not None else '', headers=cors)
        if request.method == 'OPTIONS': return route.fulfill(status=204, headers=cors)
        if self.offline: return route.abort()
        h = request.headers
        if h.get('apikey') != self.KEY: return js(401, {'message': 'Invalid API key'})
        body = json.loads(request.post_data) if request.post_data else {}
        tok = (h.get('authorization') or '').replace('Bearer ', '')
        me = None if tok in self.abgelaufen else self.tokens.get(tok)
        self.log.append((request.method, path, u.query))
        if path == '/auth/v1/token':
            g = q.get('grant_type', [''])[0]
            if g == 'password':
                usr = self.users.get(body.get('email'))
                if not usr or usr['pw'] != body.get('password'): return js(400, {'error_code': 'invalid_credentials', 'msg': 'Invalid login credentials'})
                if not usr['ok']: return js(400, {'error_code': 'email_not_confirmed'})
                return js(200, self.sitzung(body['email']))
            if g == 'refresh_token':
                mail = self.refresh.pop(body.get('refresh_token'), None)
                if not mail: return js(400, {'error_code': 'refresh_token_not_found'})
                return js(200, self.sitzung(mail))
            return js(400, {'error_code': 'unsupported_grant_type'})
        if path == '/auth/v1/signup':
            self.mails.append(('signup', body.get('email'), q.get('redirect_to', [''])[0]))
            if body.get('email') not in self.users:
                self.nutzer(body.get('email'), body.get('password'), bestaetigt=False)
                self.users[body['email']]['meta'] = body.get('data') or {}
                self.neuer_code(body['email'], 'signup')
            return js(200, {'id': 'x', 'email': body.get('email'), 'identities': []})
        if path == '/auth/v1/recover':
            self.mails.append(('recover', body.get('email'), q.get('redirect_to', [''])[0]))
            if body.get('email') in self.users: self.neuer_code(body['email'], 'recovery')
            return js(200, {})
        if path == '/auth/v1/resend':
            self.mails.append(('resend', body.get('email'), q.get('redirect_to', [''])[0]))
            usr = self.users.get(body.get('email'))
            if usr and not usr['ok'] and body.get('type') == 'signup': self.neuer_code(body['email'], 'signup')
            return js(200, {})
        if path == '/auth/v1/verify':
            key = (body.get('email'), body.get('type'))
            if not body.get('token') or self.codes.get(key) != body.get('token'): return js(403, {'error_code': 'otp_expired', 'msg': 'Token has expired or is invalid'})
            del self.codes[key]; self.users[key[0]]['ok'] = True
            return js(200, self.sitzung(key[0]))
        if path == '/rest/v1/rpc/username_frei':   # für alle; gibt nur den Status heraus
            w = (body.get('wunsch') or '').strip()
            if not re.match(r'^[A-Za-z0-9ÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_.-]{1,18}[A-Za-z0-9ÄÖÜäöüß]$', w): return js(200, 'ungueltig')
            if w.lower() in ('admin', 'manna'): return js(200, 'gesperrt')
            return js(200, 'vergeben' if any(n.lower() == w.lower() for n in self.profile.values()) else 'frei')
        if path == '/auth/v1/logout': return js(204, None)
        if path == '/rest/v1/rpc/daumen_zahlen':   # für alle, auch ohne Login; gibt nur Zahlen heraus
            z = {}
            for _, sid in self.daumen: z[sid] = z.get(sid, 0) + 1
            return js(200, [{'spiel_id': k, 'anzahl': v} for k, v in z.items()])
        if not me: return js(401, {'message': 'JWT expired'})
        mail = next(m for m, x in self.users.items() if x['id'] == me)
        if path == '/auth/v1/user':
            if request.method == 'PUT':
                if len(body.get('password', '')) < 8: return js(422, {'error_code': 'weak_password'})
                self.users[mail]['pw'] = body['password']
            return js(200, {'id': me, 'email': mail, 'user_metadata': self.users[mail]['meta']})
        if path == '/rest/v1/rpc/konto_loeschen':
            del self.users[mail]
            self.eintraege = {k: v for k, v in self.eintraege.items() if k[0] != me}
            self.bilder = {k: v for k, v in self.bilder.items() if k[0] != me}
            self.profile.pop(me, None); self.daumen = {d for d in self.daumen if d[0] != me}; self.klicks = {k: v for k, v in self.klicks.items() if k[0] != me}
            self.tokens = {t: i for t, i in self.tokens.items() if i != me}
            return js(204, None)
        if path == '/rest/v1/profile':
            if request.method == 'GET': return js(200, [{'username': self.profile[me]}] if me in self.profile else [])
            if request.method == 'POST':
                if body.get('user_id') != me: return js(403, {'code': '42501', 'message': 'rls'})
                name = body.get('username', '').strip()
                if not re.match(r'^[A-Za-z0-9ÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_.-]{1,18}[A-Za-z0-9ÄÖÜäöüß]$', name): return js(400, {'code': '23514', 'message': 'check'})
                if name.lower() in ('admin', 'manna'): return js(400, {'code': 'P0001', 'message': 'Dieser Username ist leider nicht möglich.'})
                if any(n.lower() == name.lower() for u, n in self.profile.items() if u != me): return js(409, {'code': '23505', 'message': 'duplicate key'})
                self.profile[me] = name; return js(201, [{'username': name}])
        if path == '/rest/v1/klicks':   # nur lesen, nur eigene
            if request.method != 'GET': return js(403, {'code': '42501', 'message': 'rls'})
            return js(200, [{'spiel_id': k[1], 'anzahl': v} for k, v in self.klicks.items() if k[0] == me])
        if path == '/rest/v1/rpc/klick_zaehlen':   # Konto kommt aus dem Login, nicht aus der Anfrage
            sid = body.get('spiel') or ''
            if not re.match(r'^[a-z0-9-]{1,60}$', sid): return js(400, {'code': 'P0001', 'message': 'ungueltig'})
            self.klicks[(me, sid)] = self.klicks.get((me, sid), 0) + 1; return js(200, self.klicks[(me, sid)])
        if path == '/rest/v1/daumen':
            if request.method == 'GET': return js(200, [{'spiel_id': s} for u, s in self.daumen if u == me])
            if request.method == 'POST':
                if me not in self.profile: return js(409, {'code': '23503', 'message': 'foreign key'})
                if (me, body['spiel_id']) in self.daumen: return js(409, {'code': '23505', 'message': 'duplicate key'})
                self.daumen.add((me, body['spiel_id'])); return js(201, None)
            if request.method == 'DELETE':
                self.daumen.discard((me, q.get('spiel_id', [''])[0][3:])); return js(204, None)
        inliste = lambda key: [x for x in (q.get(key, [''])[0])[4:-1].split(',') if x]
        if path == '/rest/v1/sync_eintraege':
            if request.method == 'GET':
                sel = q.get('select', [''])[0].split(','); nur = [k.strip('"') for k in inliste('schluessel')] if 'schluessel' in q else None
                rows = [dict(v, schluessel=k[1]) for k, v in self.eintraege.items() if k[0] == me and (nur is None or k[1] in nur)]
                return js(200, [{c: r[c] for c in sel} for r in rows])
            if request.method == 'POST':
                antw = []
                for r in (body if isinstance(body, list) else [body]):
                    if r.get('user_id') != me: return js(403, {'code': '42501', 'message': 'new row violates row-level security policy'})
                    if not re.match(r'^(brett|favoriten|ausgeblendet|(vorlage|spiel):[A-Za-z0-9_-]{1,60})$', r['schluessel']): return js(400, {'code': '23514', 'message': 'check'})
                    t = self.zeit()
                    self.eintraege[(me, r['schluessel'])] = {'daten': None if r.get('geloescht') else r.get('daten'), 'geloescht': bool(r.get('geloescht')), 'geaendert_am': t}
                    antw.append({'schluessel': r['schluessel'], 'geaendert_am': t})
                return js(201, antw)
        if path == '/rest/v1/sync_bilder':
            if request.method == 'GET':
                sel = q.get('select', [''])[0]; ids = inliste('bild_id') if 'bild_id' in q else None
                rows = [{'bild_id': k[1], 'erstellt_am': v['erstellt_am'], 'daten': v['daten']} for k, v in self.bilder.items() if k[0] == me and (ids is None or k[1] in ids)]
                return js(200, [{c: r[c] for c in sel.split(',')} for r in rows])
            if request.method == 'POST':
                if body.get('user_id') != me: return js(403, {'code': '42501', 'message': 'rls'})
                self.bilder.setdefault((me, body['bild_id']), {'daten': body['daten'], 'erstellt_am': '2026-11-26T12:00:00Z'})
                return js(201, None)
            if request.method == 'DELETE':
                for i in inliste('bild_id'): self.bilder.pop((me, i), None)
                return js(204, None)
        return js(404, {'message': 'not found'})

def konto_checks(p):
    print('Konto & Sync')
    errs = []
    sb = FakeSupabaseKonten()
    sb.nutzer('anna@example.org', 'Geheim-123'); sb.nutzer('ben@example.org', 'Geheim-456')
    b = p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
    sbjs = open(os.path.join(ROOT, 'js', 'supabase.js'), encoding='utf-8').read()
    check('Registrierung: Konten sind für alle freigeschaltet', 'kontenFuerAlle: true' in sbjs)
    alle = lambda route, request: route.fulfill(status=200, content_type='application/javascript', body=sbjs)
    testphase = lambda route, request: route.fulfill(status=200, content_type='application/javascript', body=sbjs.replace('kontenFuerAlle: true', 'kontenFuerAlle: false'))
    # Testphase (falls wieder zurückgeschaltet wird): anmelden ja, registrieren nein
    t = gameshows_an(b.new_context(viewport={'width': 1280, 'height': 900}, service_workers='block')); t.route('https://atdfiktajxmhjqrhwgbb.supabase.co/**', sb.handle); t.route('**/js/supabase.js', testphase)
    tp = t.new_page(); tp.on('pageerror', lambda e: errs.append('Testphase: ' + str(e))); tp.goto(URL); tp.wait_for_timeout(400)
    if tp.locator('#clDialog.show').count(): tp.click('#clX')
    tp.click('#btnKonto'); tp.wait_for_timeout(200)
    check('Testphase: Anmelden möglich, „Konto erstellen“ ausgeblendet', tp.locator('#kForm').is_visible() and tp.locator('#btnKLogin').is_visible() and not tp.locator('#btnKReg').is_visible())
    t.close()
    def geraet():
        ctx = gameshows_an(b.new_context(viewport={'width': 1280, 'height': 900}, service_workers='block'))
        ctx.route('https://atdfiktajxmhjqrhwgbb.supabase.co/**', sb.handle); ctx.route('**/js/supabase.js', alle)
        m = ctx.new_page(); m.on('pageerror', lambda e: errs.append(str(e))); m.on('console', (lambda c: errs.append('CSP: ' + c.text) if 'Content Security Policy' in c.text else None))
        m.goto(URL); m.wait_for_timeout(400)
        if m.locator('#clDialog.show').count(): m.click('#clX')
        return ctx, m
    def sync(m):
        m.evaluate("kontoSync('test')"); m.wait_for_function("!syncLaeuft"); m.wait_for_timeout(500); m.wait_for_function("!syncLaeuft")
    def anmelden(m, mail, pw):
        if not m.locator('#kontoScreen.show').count(): m.click('#btnKonto'); m.wait_for_timeout(150)
        m.fill('#kMail', mail); m.fill('#kPass', pw); m.click('#btnKLogin'); m.wait_for_timeout(600); m.wait_for_function("!syncLaeuft")
    bild = 'data:image/png;base64,' + base64.b64encode(tiny_png()).decode()
    ctxA, A = geraet()
    check('Konto: Knopf „Anmelden“ auf der Startseite', A.inner_text('#btnKonto') == 'Anmelden')
    check('Konto: ohne Login keine Anfrage an Supabase', not sb.log)
    A.click('#btnKonto'); A.wait_for_timeout(200)
    check('Konto: Seite mit Anmeldeformular', A.locator('#kontoScreen.show').count() == 1 and A.locator('#kForm').is_visible() and not A.locator('#kontoAn').is_visible())
    A.click('#btnKLogin'); A.wait_for_timeout(100)
    check('Konto: leere Felder werden bemängelt', 'E-Mail und Passwort' in A.inner_text('#kMsg') and not sb.log)
    A.fill('#kMail', 'anna@example.org'); A.fill('#kPass', 'falsch'); A.click('#btnKLogin'); A.wait_for_timeout(300)
    check('Konto: falsches Passwort abgelehnt', 'stimmt nicht' in A.inner_text('#kMsg') and A.evaluate("localStorage.getItem('manna_konto')") is None)
    # Registrieren
    A.fill('#kMail', 'neu@example.org'); A.click('#btnKReg'); A.wait_for_timeout(200)
    check('Registrierung: eigene Ansicht, E-Mail wird übernommen', A.locator('#kRegForm').is_visible() and not A.locator('#kForm').is_visible() and A.input_value('#kRMail') == 'neu@example.org')
    A.click('#btnKRegLos'); A.wait_for_timeout(100)
    check('Registrierung: leere Felder werden bemängelt', 'Username' in A.inner_text('#kRegMsg') and not any(x[0] == 'signup' for x in sb.mails))
    A.fill('#kRName', 'ab'); A.fill('#kRPass', 'Lang-genug-1'); A.click('#btnKRegLos'); A.wait_for_timeout(100)
    check('Registrierung: ungültiger Username abgelehnt', '3 bis 20' in A.inner_text('#kRegMsg') and not any(x[0] == 'signup' for x in sb.mails))
    A.fill('#kRName', 'Neuling'); A.fill('#kRPass', 'kurz'); A.click('#btnKRegLos'); A.wait_for_timeout(100)
    check('Registrierung: verlangt 8 Zeichen', '8 Zeichen' in A.inner_text('#kRegMsg') and not any(x[0] == 'signup' for x in sb.mails))
    sb.profile['00000000-0000-4000-8000-000000000099'] = 'Vergeben'
    A.fill('#kRName', 'vergeben'); A.fill('#kRPass', 'Lang-genug-1'); A.click('#btnKRegLos'); A.wait_for_timeout(300)
    check('Registrierung: vergebener Username wird vorher erkannt', 'gibt es schon' in A.inner_text('#kRegMsg') and not any(x[0] == 'signup' for x in sb.mails))
    A.fill('#kRName', 'Admin'); A.click('#btnKRegLos'); A.wait_for_timeout(300)
    check('Registrierung: gesperrter Username abgelehnt', 'nicht möglich' in A.inner_text('#kRegMsg') and not any(x[0] == 'signup' for x in sb.mails))
    del sb.profile['00000000-0000-4000-8000-000000000099']
    A.fill('#kRName', 'Neuling'); A.fill('#kRPass', 'Lang-genug-1'); A.click('#btnKRegLos'); A.wait_for_timeout(400)
    check('Registrierung: Mail mit Rücksprung zur App, danach Code-Eingabe', sb.mails[-1][0] == 'signup' and sb.mails[-1][2].startswith('http://localhost') and A.locator('#kCodeForm').is_visible() and 'neu@example.org' in A.inner_text('#kCodeInfo') and A.input_value('#kRPass') == '')
    check('Registrierung: Username wird beim Nutzer mitgeschickt', sb.users['neu@example.org']['meta'] == {'username': 'Neuling'})
    A.fill('#kCode', '999999'); A.click('#btnKCode'); A.wait_for_timeout(300)
    check('Code: falscher Code abgelehnt', 'stimmt nicht' in A.inner_text('#kCodeMsg') and A.evaluate("localStorage.getItem('manna_konto')") is None)
    alt = sb.codes[('neu@example.org', 'signup')]
    A.click('#btnKCodeNeu'); A.wait_for_timeout(300)
    check('Code: „nochmal schicken“ schickt neuen Code', sb.mails[-1][:2] == ('resend', 'neu@example.org') and sb.codes[('neu@example.org', 'signup')] != alt and 'neuen Code' in A.inner_text('#kCodeMsg'))
    A.click('#btnKCodeZurueck'); A.wait_for_timeout(150)
    A.fill('#kPass', 'Lang-genug-1'); A.click('#btnKLogin'); A.wait_for_timeout(300)
    check('Code: unbestätigtes Konto beim Anmelden führt zur Code-Eingabe', A.locator('#kCodeForm').is_visible() and 'noch nicht bestätigt' in A.inner_text('#kCodeInfo') and A.evaluate("localStorage.getItem('manna_konto')") is None)
    A.fill('#kCode', alt); A.click('#btnKCode'); A.wait_for_timeout(300)
    check('Code: alter Code gilt nicht mehr', 'stimmt nicht' in A.inner_text('#kCodeMsg'))
    A.fill('#kCode', ' ' + sb.codes[('neu@example.org', 'signup')] + ' '); A.click('#btnKCode'); A.wait_for_timeout(800); A.wait_for_function("!syncLaeuft")
    check('Code: richtiger Code bestätigt und meldet an', A.locator('#kontoAn').is_visible() and A.inner_text('#kWer') == 'neu@example.org' and sb.users['neu@example.org']['ok'])
    A.wait_for_timeout(300)
    check('Registrierung: Username wird beim ersten Login angelegt', '00000000-0000-4000-8000-000000000003' in sb.profile and sb.profile['00000000-0000-4000-8000-000000000003'] == 'Neuling' and A.input_value('#kName') == 'Neuling')
    check('Registrierung: Wunsch-Username danach nicht mehr gespeichert', A.evaluate("JSON.parse(localStorage.manna_konto).wunsch") == '')
    A.evaluate("showScreen('konto')"); A.click('#btnKAbmelden'); A.wait_for_timeout(100); A.click('#dYes'); A.wait_for_timeout(200)
    check('Konto: nach dem Abmelden wieder die Anmeldung', A.locator('#kForm').is_visible() and not A.locator('#kCodeForm').is_visible())
    # Username ist inzwischen vergeben (zwischen Registrierung und erstem Login)
    sb.nutzer('spaet@example.org', 'Lang-genug-2', bestaetigt=True); sb.users['spaet@example.org']['meta'] = {'username': 'neuling'}
    anmelden(A, 'spaet@example.org', 'Lang-genug-2'); A.wait_for_timeout(300)
    check('Registrierung: inzwischen vergebener Username wird erklärt', A.locator('#dialog.show').count() == 1 and 'inzwischen' in A.inner_text('#dMsg') and A.input_value('#kName') == 'neuling')
    A.evaluate("document.querySelector('#dialog').classList.remove('show')")
    A.evaluate("showScreen('konto')"); A.click('#btnKAbmelden'); A.wait_for_timeout(100); A.click('#dYes'); A.wait_for_timeout(200)
    # Passwort vergessen per Code
    A.fill('#kMail', 'anna@example.org'); A.click('#btnKVergessen'); A.wait_for_timeout(300)
    check('Passwort vergessen: Mail und Code-Eingabe', sb.mails[-1][:2] == ('recover', 'anna@example.org') and A.locator('#kCodeForm').is_visible() and 'anna@example.org' in A.inner_text('#kCodeInfo'))
    A.fill('#kCode', sb.codes[('anna@example.org', 'recovery')]); A.click('#btnKCode'); A.wait_for_timeout(600)
    check('Passwort vergessen: Code meldet an und fragt neues Passwort', A.locator('#kNeuForm').is_visible() and A.evaluate("JSON.parse(localStorage.manna_konto).email") == 'anna@example.org')
    A.fill('#kNeuPass', 'Geheim-123'); A.click('#btnKNeu'); A.wait_for_timeout(300); A.wait_for_function("!syncLaeuft")
    A.evaluate("showScreen('konto')"); A.click('#btnKEntfernen'); A.wait_for_timeout(100); A.click('#dYes'); A.wait_for_timeout(200)
    sb.eintraege = {k: v for k, v in sb.eintraege.items() if k[0] != sb.users['anna@example.org']['id']}
    A.evaluate("localStorage.removeItem('manna_sync')")

    # Gerät A hat schon Daten, bevor es ein Konto gibt
    A.evaluate("""(async()=>{
      await imgPut('img-test01', %s);
      storeOwnGames([normOwn({id:'og-quiz1',name:'Bibelquiz',rounds:[{title:'Runde 1',text:'Wer baute die Arche?',img:'img-test01',extra:[]}]})]);
      lsSet(TPL_KEY,JSON.stringify([{id:'own-tpl1',name:'Weihnachten',title:'Weihnachtsquiz',points:[10,20],desc:'',cats:[{name:'Krippe',items:[{type:'frage',text:'Wie viele Weise?',answer:'3'}]}]}]));
      toggleFav('zeitungsschlagen');
      S.title='Jugendabend Brett';save();
    })()""" % json.dumps(bild))
    anmelden(A, 'anna@example.org', 'Geheim-123')
    a_id = sb.users['anna@example.org']['id']
    keys = sorted(k[1] for k in sb.eintraege if k[0] == a_id)
    check('Konto: nach dem Login angemeldet, Knopf heißt „Konto“', A.inner_text('#btnKonto') == 'Konto' and A.inner_text('#kWer') == 'anna@example.org' and A.locator('#kontoAn').is_visible())
    check('Sync: vorhandene Daten landen im Konto', keys == ['brett', 'favoriten', 'spiel:og-quiz1', 'vorlage:own-tpl1'], keys)
    check('Sync: Bild hochgeladen', (a_id, 'img-test01') in sb.bilder)
    check('Sync: Spielstand gehört nicht dazu', 'used' not in sb.eintraege[(a_id, 'brett')]['daten'] and 'score' not in json.dumps(sb.eintraege[(a_id, 'brett')]['daten']))
    check('Sync: Stand wird angezeigt', 'abgeglichen' in A.inner_text('#kStand'))
    check('Sicherheit: Zugangsdaten nur als Schlüssel, kein Passwort gespeichert', 'Geheim-123' not in A.evaluate("JSON.stringify(localStorage)"))

    # Zweites Gerät
    ctxB, B = geraet()
    anmelden(B, 'anna@example.org', 'Geheim-123')
    B.wait_for_timeout(300)
    check('Sync: zweites Gerät bekommt eigenes Spiel', B.evaluate("ownGames().map(g=>g.name)") == ['Bibelquiz'])
    check('Sync: zweites Gerät bekommt das Bild', B.evaluate("imgGet('img-test01')") == bild)
    check('Sync: zweites Gerät bekommt Vorlage und Favorit', B.evaluate("ownTpl().map(t=>t.name)") == ['Weihnachten'] and B.evaluate("favs") == ['zeitungsschlagen'])
    check('Sync: unbenutztes Standard-Brett wird durch das vorbereitete ersetzt', B.evaluate("S.title") == 'Jugendabend Brett')
    check('Sync: keine doppelten Einträge im Konto', len([k for k in sb.eintraege if k[0] == a_id]) == 4)

    # Änderung auf B, Abgleich auf A
    B.evaluate("(()=>{const g=ownGames();g[0].name='Bibelquiz XXL';storeOwnGames(g);})()")
    B.wait_for_timeout(3200); B.wait_for_function("!syncLaeuft")
    check('Sync: Änderung wird automatisch hochgeladen', sb.eintraege[(a_id, 'spiel:og-quiz1')]['daten']['name'] == 'Bibelquiz XXL')
    sync(A)
    check('Sync: Änderung kommt auf dem anderen Gerät an', A.evaluate("ownGames().map(g=>g.name)") == ['Bibelquiz XXL'])
    n_post = len([x for x in sb.log if x[0] == 'POST' and x[1] == '/rest/v1/sync_eintraege'])
    sync(A); sync(B)
    gets = [x for x in sb.log if x[1] == '/rest/v1/sync_eintraege' and x[0] == 'GET']
    check('Sync: ohne Änderung werden keine Inhalte geladen, nur Zeitstempel', all('daten' not in unquote(g[2]) for g in gets[-2:]), gets[-2:])
    check('Sync: ohne Änderung wird nichts hochgeladen', len([x for x in sb.log if x[0] == 'POST' and x[1] == '/rest/v1/sync_eintraege']) == n_post)

    # Beide ändern dasselbe Spiel: nichts darf verloren gehen
    A.evaluate("(()=>{const g=ownGames();g[0].rounds[0].text='Fassung A';kStill(()=>storeOwnGames(g));})()")
    B.evaluate("(()=>{const g=ownGames();g[0].rounds[0].text='Fassung B';kStill(()=>storeOwnGames(g));})()")
    sync(A); sync(B); sync(A); sync(B)
    ta = sorted(A.evaluate("ownGames().map(g=>g.name+'|'+g.rounds[0].text)")); tb = sorted(B.evaluate("ownGames().map(g=>g.name+'|'+g.rounds[0].text)"))
    check('Sync: Konflikt – beide Fassungen bleiben erhalten', ta == tb == ['Bibelquiz XXL (Kopie)|Fassung B', 'Bibelquiz XXL|Fassung A'], (ta, tb))
    check('Sync: Konflikt – Bild gilt für beide Fassungen', B.evaluate("imgGet('img-test01')") == bild)

    # Favoriten auf beiden Geräten: zusammenlegen
    A.evaluate("kStill(()=>toggleFav('mafia'))"); B.evaluate("kStill(()=>toggleFav('werwolf'))")
    sync(A); sync(B); sync(A)
    check('Sync: Favoriten von beiden Geräten werden zusammengelegt', A.evaluate("[...favs].sort()") == B.evaluate("[...favs].sort()") == ['mafia', 'werwolf', 'zeitungsschlagen'], (A.evaluate("favs"), B.evaluate("favs")))

    # Löschen
    A.evaluate("lsSet(TPL_KEY,'[]');datenGeaendert()"); A.wait_for_timeout(3200); A.wait_for_function("!syncLaeuft")
    check('Sync: Löschen wird als „gelöscht“ markiert', sb.eintraege[(a_id, 'vorlage:own-tpl1')]['geloescht'] is True and sb.eintraege[(a_id, 'vorlage:own-tpl1')]['daten'] is None)
    sync(B)
    check('Sync: gelöschte Vorlage verschwindet auch auf dem anderen Gerät', B.evaluate("ownTpl().length") == 0)

    # Spielbrett: nicht austauschen, während gespielt wird
    B.evaluate("(()=>{S.used={'0-0':1};S.teams[0].score=20;kStill(()=>save());})()")
    A.evaluate("S.title='Neues Brett von A';save()"); A.wait_for_timeout(3200); A.wait_for_function("!syncLaeuft")
    B.evaluate("showScreen('gmenu')"); sync(B); B.evaluate("renderGMenu()")
    check('Sync: laufendes Spiel wird nicht überschrieben', B.evaluate("S.title") == 'Jugendabend Brett' and B.evaluate("S.teams[0].score") == 20)
    check('Sync: Hinweis im Gameshow-Menü, dass ein neues Brett wartet', B.locator('#gmList .konto-brett').count() == 1)
    B.click('#gmList .konto-brett .primary'); B.wait_for_timeout(150); B.click('#dYes'); B.wait_for_timeout(300); B.wait_for_function("!syncLaeuft")
    check('Sync: auf Wunsch wird das neue Brett übernommen', B.evaluate("S.title") == 'Neues Brett von A' and B.evaluate("S.teams[0].score") == 0 and B.evaluate("Object.keys(S.used).length") == 0)
    check('Sync: Hinweis danach weg', B.locator('#gmList .konto-brett').count() == 0)

    # Abgelaufene Anmeldung wird still erneuert
    tok = A.evaluate("JSON.parse(localStorage.manna_konto).access"); sb.abgelaufen.add(tok)
    A.evaluate("kStill(()=>toggleFav('ninja'))"); sync(A)
    check('Konto: abgelaufene Anmeldung wird erneuert', A.evaluate("JSON.parse(localStorage.manna_konto).access") != tok and 'ninja' in sb.eintraege[(a_id, 'favoriten')]['daten'])

    # Offline
    sb.offline = True; A.evaluate("kStill(()=>toggleFav('stopp'))"); sync(A)
    check('Sync: offline verständliche Meldung, nichts geht verloren', 'Offline' in A.evaluate("(showScreen('konto'),document.querySelector('#kStand').textContent)") and 'stopp' in A.evaluate("favs"))
    sb.offline = False; A.evaluate("dispatchEvent(new Event('online'))"); A.wait_for_timeout(500); A.wait_for_function("!syncLaeuft")
    check('Sync: wird nachgeholt, sobald das Internet wieder da ist', 'stopp' in sb.eintraege[(a_id, 'favoriten')]['daten'])

    # Eintrag im Konto ganz verschwunden (z. B. von Hand in der Datenbank gelöscht): nicht auf dem Gerät löschen, wieder hochladen
    sb.eintraege.pop((a_id, 'spiel:og-quiz1'), None); sync(A)
    check('Sync: im Konto verschwundener Eintrag wird wieder hochgeladen statt gelöscht', (a_id, 'spiel:og-quiz1') in sb.eintraege and 'og-quiz1' in A.evaluate("ownGames().map(g=>g.id).join()"))
    # Fremdes Konto auf demselben Gerät
    B.evaluate("showScreen('konto')"); B.click('#btnKAbmelden'); B.wait_for_timeout(100); B.click('#dYes'); B.wait_for_timeout(200)
    check('Konto: Abmelden behält die Daten auf dem Gerät', B.evaluate("localStorage.getItem('manna_konto')") is None and B.evaluate("ownGames().length") == 2 and B.inner_text('#btnKonto') == 'Anmelden')
    B.fill('#kMail', 'ben@example.org'); B.fill('#kPass', 'Geheim-456'); B.click('#btnKLogin'); B.wait_for_timeout(400)
    ben = sb.users['ben@example.org']['id']
    check('Konto: anderes Konto – erst nachfragen, nichts hochladen', B.locator('#dialog.show').count() == 1 and 'anderen Konto' in B.inner_text('#dMsg') and not [k for k in sb.eintraege if k[0] == ben])
    B.click('#dNo'); B.wait_for_timeout(300)
    check('Konto: „Abbrechen“ meldet wieder ab, nichts landet im fremden Konto', B.evaluate("localStorage.getItem('manna_konto')") is None and not [k for k in sb.eintraege if k[0] == ben])
    B.evaluate("document.querySelector('#dialog').classList.remove('show')")
    B.fill('#kMail', 'anna@example.org'); B.fill('#kPass', 'Geheim-123'); B.click('#btnKLogin'); B.wait_for_timeout(300)
    B.click('#btnKEntfernen'); B.wait_for_timeout(100); B.click('#dYes'); B.wait_for_timeout(300)
    check('Konto: Abmelden und entfernen leert das Gerät', B.evaluate("ownGames().length") == 0 and B.evaluate("ownTpl().length") == 0 and B.evaluate("favs.length") == 0 and B.evaluate("S.title") == 'Der große Preis' and B.evaluate("localStorage.getItem('manna_sync')") is None)
    check('Konto: das Konto selbst bleibt dabei erhalten', len([k for k in sb.eintraege if k[0] == a_id and not sb.eintraege[k]['geloescht']]) >= 4)
    anmelden(B, 'ben@example.org', 'Geheim-456')
    check('Sicherheit: anderes Konto sieht nichts von Anna', B.evaluate("ownGames().length") == 0 and B.evaluate("favs.length") == 0 and B.locator('#dialog.show').count() == 0)

    # Passwort zurücksetzen über den Link aus der E-Mail
    ctxC, C = geraet()
    s = sb.sitzung('anna@example.org')
    C.goto('about:blank'); C.goto(URL + f"#access_token={s['access_token']}&expires_in=3600&refresh_token={s['refresh_token']}&token_type=bearer&type=recovery"); C.wait_for_timeout(700)
    check('Konto: Link aus der Mail wird aus der Adresszeile entfernt', 'access_token' not in C.url)
    check('Konto: nach „Passwort vergessen“ wird ein neues Passwort verlangt', C.locator('#kontoScreen.show').count() == 1 and C.locator('#kNeuForm').is_visible())
    C.fill('#kNeuPass', 'Ganz-neu-789'); C.click('#btnKNeu'); C.wait_for_timeout(300)
    check('Konto: neues Passwort gespeichert', sb.users['anna@example.org']['pw'] == 'Ganz-neu-789' and not C.locator('#kNeuForm').is_visible())
    C.goto('about:blank'); C.goto(URL + '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'); C.wait_for_timeout(500)
    check('Konto: abgelaufener Link wird erklärt', 'abgelaufen' in C.inner_text('#kMsg') and 'error' not in C.url)
    ctxC.close()

    # Sicherheit: Anmelde-Link (z. B. Passwort zurücksetzen) für ein FREMDES Konto auf einem Gerät,
    # das zu einem anderen Konto gehört: nichts darf ungefragt in das fremde Konto hochgeladen werden
    sb.nutzer('cora@example.org', 'Geheim-999')
    ctxD, D = geraet()
    D.evaluate("storeOwnGames([normOwn({id:'og-privat',name:'Annas Spiel'})])")
    D.evaluate("lsSet('manna_sync',JSON.stringify({user:%s,base:{},zuletzt:1}))" % json.dumps(sb.users['anna@example.org']['id']))
    s2 = sb.sitzung('cora@example.org')
    D.goto('about:blank'); D.goto(URL + f"#access_token={s2['access_token']}&expires_in=3600&refresh_token={s2['refresh_token']}&token_type=bearer&type=recovery"); D.wait_for_timeout(800)
    cora = sb.users['cora@example.org']['id']
    check('Sicherheit: Anmelde-Link für fremdes Konto lädt nichts ungefragt hoch', D.locator('#dialog.show').count() == 1 and 'anderen Konto' in D.inner_text('#dMsg') and not [k for k in sb.eintraege if k[0] == cora])
    D.click('#dNo'); D.wait_for_timeout(500)
    check('Sicherheit: Abbrechen meldet den Link wieder ab', D.evaluate("localStorage.getItem('manna_konto')") is None and not [k for k in sb.eintraege if k[0] == cora])
    ctxD.close()

    # Sicherheit: präparierter Link mit den Zugangsdaten eines FREMDEN Kontos auf einem Gerät, das noch nie abgeglichen hat
    # (Login-CSRF). Vorher wurden die Daten des Geräts ungefragt in das fremde Konto hochgeladen.
    ctxE, E = geraet()
    E.evaluate("storeOwnGames([normOwn({id:'og-meins',name:'Mein Spiel'})])")
    s3 = sb.sitzung('cora@example.org')
    E.goto('about:blank'); E.goto(URL + f"#access_token={s3['access_token']}&expires_in=3600&refresh_token={s3['refresh_token']}&token_type=bearer&type=signup"); E.wait_for_timeout(800)
    check('Sicherheit: fremder Link auf neuem Gerät fragt erst (mit E-Mail des Kontos), lädt nichts hoch',
          E.locator('#dialog.show').count() == 1 and 'cora@example.org' in E.inner_text('#dMsg') and not [k for k in sb.eintraege if k[0] == cora])
    E.reload(); E.wait_for_timeout(1500)
    check('Sicherheit: App bei offener Frage geschlossen – danach nicht angemeldet, nichts hochgeladen',
          E.evaluate("localStorage.getItem('manna_konto')") is None and not [k for k in sb.eintraege if k[0] == cora])
    s3 = sb.sitzung('cora@example.org')
    E.goto('about:blank'); E.goto(URL + f"#access_token={s3['access_token']}&expires_in=3600&refresh_token={s3['refresh_token']}&token_type=bearer&type=signup"); E.wait_for_timeout(800)
    E.click('#dNo'); E.wait_for_timeout(500)
    check('Sicherheit: Abbrechen meldet ab, die eigenen Daten bleiben auf dem Gerät',
          E.evaluate("localStorage.getItem('manna_konto')") is None and E.evaluate("ownGames().length") == 1 and not [k for k in sb.eintraege if k[0] == cora])
    ctxE.close()
    # Gerät ohne eigene Daten: Bestätigungslink meldet ohne Rückfrage an
    ctxF, Fp = geraet()
    s4 = sb.sitzung('cora@example.org')
    Fp.goto('about:blank'); Fp.goto(URL + f"#access_token={s4['access_token']}&expires_in=3600&refresh_token={s4['refresh_token']}&token_type=bearer&type=signup"); Fp.wait_for_timeout(800)
    check('Konto: Bestätigungslink auf leerem Gerät meldet ohne Rückfrage an', Fp.locator('#dialog.show').count() == 0 and Fp.evaluate("JSON.parse(localStorage.getItem('manna_konto')||'{}').email") == 'cora@example.org')
    ctxF.close()

    # Username & Daumen hoch
    def spiel(m, gid):
        m.evaluate("showScreen('coll')"); m.wait_for_timeout(300); m.evaluate("openGame(%s)" % json.dumps(gid)); m.wait_for_timeout(150)
    def zu(m):
        m.evaluate("document.querySelector('#dialog').classList.remove('show')")
    spiel(B, 'zeitungsschlagen'); B.click('#btnDaumen'); B.wait_for_timeout(200)
    check('Daumen: ohne Username Hinweis statt Daumen', B.locator('#dialog.show').count() == 1 and 'Username' in B.inner_text('#dMsg') and not sb.daumen)
    zu(B); B.evaluate("showScreen('konto')"); B.wait_for_timeout(100)
    check('Username: Feld auf der Konto-Seite', B.locator('#kNameForm').is_visible() and B.input_value('#kName') == '')
    B.fill('#kName', 'b'); B.click('#btnKName'); B.wait_for_timeout(200)
    check('Username: zu kurzer Name wird abgelehnt', '3 bis 20' in B.inner_text('#kNameMsg') and sb.users['ben@example.org']['id'] not in sb.profile)
    B.fill('#kName', 'Ben_77'); B.click('#btnKName'); B.wait_for_timeout(300)
    ben_id = sb.users['ben@example.org']['id']
    check('Username: wird gespeichert', sb.profile.get(ben_id) == 'Ben_77' and B.inner_text('#kNameMsg') == '')
    A.evaluate("showScreen('konto')"); A.wait_for_timeout(200); A.fill('#kName', 'ben_77'); A.click('#btnKName'); A.wait_for_timeout(300)
    check('Username: schon vergeben (Groß-/Kleinschreibung egal)', 'gibt es schon' in A.inner_text('#kNameMsg') and a_id not in sb.profile)
    A.fill('#kName', 'Manna'); A.click('#btnKName'); A.wait_for_timeout(300)
    check('Username: reservierter Name wird abgelehnt', 'nicht möglich' in A.inner_text('#kNameMsg') and a_id not in sb.profile)
    A.fill('#kName', 'Anna'); A.click('#btnKName'); A.wait_for_timeout(300)
    spiel(B, 'zeitungsschlagen'); B.click('#btnDaumen'); B.wait_for_timeout(300)
    check('Daumen: mit Username gesetzt', (ben_id, 'zeitungsschlagen') in sb.daumen and B.get_attribute('#btnDaumen', 'aria-pressed') == 'true' and B.inner_text('#btnDaumen .daumen-n') == '1')
    spiel(A, 'zeitungsschlagen'); A.wait_for_timeout(200)
    check('Daumen: Anzahl ist für andere sichtbar', A.inner_text('#btnDaumen .daumen-n') == '1' and A.get_attribute('#btnDaumen', 'aria-pressed') == 'false')
    A.click('#btnDaumen'); A.wait_for_timeout(300)
    check('Daumen: zweiter Daumen zählt mit', len([d for d in sb.daumen if d[1] == 'zeitungsschlagen']) == 2 and A.inner_text('#btnDaumen .daumen-n') == '2')
    A.evaluate("showScreen('coll')"); A.wait_for_timeout(400)
    check('Daumen: Symbol mit Zahl in der Liste', A.locator('.game-row .gdaumen').count() == 1 and A.inner_text('.game-row .gdaumen') == '2')
    spiel(B, 'zeitungsschlagen'); B.click('#btnDaumen'); B.wait_for_timeout(300)
    check('Daumen: nochmal tippen nimmt ihn zurück (kein Daumen runter)', (ben_id, 'zeitungsschlagen') not in sb.daumen and len(sb.daumen) == 1 and B.get_attribute('#btnDaumen', 'aria-pressed') == 'false')
    B.click('#btnDaumen'); B.wait_for_timeout(300)
    gast = gameshows_an(b.new_context(viewport={'width': 1280, 'height': 900}, service_workers='block')); gast.route('https://atdfiktajxmhjqrhwgbb.supabase.co/**', sb.handle)
    G = gast.new_page(); G.on('pageerror', lambda e: errs.append('Gast: ' + str(e))); G.goto(URL); G.wait_for_timeout(400)
    if G.locator('#clDialog.show').count(): G.click('#clX')
    n_vorher = len(sb.log)
    spiel(G, 'zeitungsschlagen'); G.wait_for_timeout(300)
    check('Daumen: ohne Konto ist die Anzahl sichtbar', G.inner_text('#btnDaumen .daumen-n') == '2')
    G.click('#btnDaumen'); G.wait_for_timeout(200)
    check('Daumen: ohne Konto Hinweis zum Anmelden, nichts gespeichert', G.locator('#dialog.show').count() == 1 and 'Melde dich an' in G.inner_text('#dMsg') and len(sb.daumen) == 2)
    check('Daumen: ohne Konto nur die Zahlen abgefragt', all(x[1] == '/rest/v1/rpc/daumen_zahlen' for x in sb.log[n_vorher:]))
    check('Klicks: ohne Konto nichts gezählt', not [x for x in sb.log[n_vorher:] if 'klick' in x[1]])
    G.evaluate("showScreen('coll')"); G.wait_for_timeout(300)
    check('Klicks: ohne Konto keine Empfehlung, alphabetisch', G.locator('.gempf').count() == 0)
    gast.close()

    # Klicks & „Empfehlung für dich“
    for _ in range(3): spiel(A, 'simon-says'); A.wait_for_timeout(100)
    A.wait_for_timeout(300)
    check('Klicks: Öffnen zählt pro Konto und Spiel hoch', sb.klicks.get((a_id, 'simon-says')) == 3 and sb.klicks.get((a_id, 'zeitungsschlagen'), 0) >= 1)
    check('Klicks: anderes Konto zählt getrennt', sb.klicks.get((ben_id, 'zeitungsschlagen'), 0) >= 1 and (ben_id, 'simon-says') not in sb.klicks)
    A.evaluate("showScreen('coll')"); A.wait_for_timeout(300)
    erste = A.locator('.game-row').first
    check('Empfehlung: meistgeöffnetes Spiel steht oben mit Hinweis', A.locator('.gempf').count() == 1 and 'Simon' in erste.inner_text() and erste.locator('.gempf').inner_text() == 'Empfehlung für dich')
    A.fill('#collSearch', 'zeitung'); A.wait_for_timeout(200)
    check('Empfehlung: bei der Suche nicht', A.locator('.gempf').count() == 0)
    A.fill('#collSearch', ''); A.wait_for_timeout(200)
    spiel(B, 'nachts-in-palermo'); B.wait_for_timeout(200); B.evaluate("showScreen('coll')"); B.wait_for_timeout(300)
    check('Empfehlung: jedes Konto bekommt seine eigene', 'Palermo' in B.locator('.game-row.empf').inner_text() or 'Zeitung' in B.locator('.game-row.empf').inner_text())

    # Konto löschen
    B.evaluate("showScreen('konto')"); B.click('#btnKLoeschen'); B.wait_for_timeout(100)
    check('Konto löschen: deutliche Warnung', 'endgültig' in B.inner_text('#dMsg'))
    B.click('#dYes'); B.wait_for_timeout(400)
    check('Konto löschen: Konto und Daten weg, abgemeldet', 'ben@example.org' not in sb.users and not [k for k in sb.eintraege if k[0] == ben] and ben not in sb.profile and not [d for d in sb.daumen if d[0] == ben] and not [k for k in sb.klicks if k[0] == ben] and B.evaluate("localStorage.getItem('manna_konto')") is None)

    v = gameshows_an(b.new_context(viewport={'width': 1280, 'height': 900}, service_workers='block')); v.route('https://atdfiktajxmhjqrhwgbb.supabase.co/**', sb.handle)
    vp = v.new_page(); vp.on('pageerror', lambda e: errs.append('Zuschauer: ' + str(e))); vp.goto(URL + '#zuschauer'); vp.wait_for_timeout(400)
    check('Konto: Zuschaueransicht zeigt keinen Konto-Knopf', not vp.locator('#btnKonto').is_visible())
    v.close()
    A.set_viewport_size({'width': 390, 'height': 844}); A.evaluate("showScreen('konto')"); A.wait_for_timeout(200)
    check('Konto: Handy ohne seitliches Scrollen', not A.evaluate('document.documentElement.scrollWidth > innerWidth'))
    A.evaluate("showScreen('home')"); A.wait_for_timeout(100)
    box = A.evaluate("(()=>{const a=document.querySelector('#btnKonto').getBoundingClientRect(),b=document.querySelector('#homeBrand').getBoundingClientRect();return a.bottom<=b.top||a.right<=b.left||a.left>=b.right})()")
    check('Konto: Knopf überdeckt auf dem Handy nicht das Logo', box)
    check('Konto: keine JavaScript-Fehler (auch keine CSP-Verstöße)', not errs, '; '.join(errs))
    ctxA.close(); ctxB.close(); b.close()

if __name__ == '__main__':
    httpd = serve()
    try:
        static_checks()
        spiele_checks()
        with sync_playwright() as p:
            browser_checks(p)
            gameshows_aus_checks(p)
            mobile_checks(p)
            editor_checks(p)
            einreichen_checks(p)
            konto_checks(p)
    except Exception:
        traceback.print_exc(); results.append(('Testlauf ohne Absturz', False, ''))
    finally:
        httpd.shutdown()
    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)} von {len(results)} Prüfungen bestanden.')
    sys.exit(1 if failed else 0)
