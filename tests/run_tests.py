"""Automatische Tests für „Der große Preis“.

Startet einen lokalen Webserver, öffnet die App in Chromium und spielt die
wichtigsten Abläufe durch. Beendet sich mit Fehlercode, wenn etwas nicht stimmt.

Lokal ausführen:   pip install playwright && python -m playwright install chromium
                   python tests/run_tests.py
"""
import functools, http.server, json, os, re, socketserver, sys, threading, traceback
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8799
URL = f'http://localhost:{PORT}/index.html'
CHROME = os.environ.get('CHROME_PATH')  # optional: eigener Browser

results = []
def check(name, cond, info=''):
    results.append((name, bool(cond), info))
    print(('  ok   ' if cond else '  FAIL ') + name + (f'  ({info})' if info and not cond else ''))

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('localhost', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def static_checks():
    print('Statische Prüfungen')
    emoji = re.compile('[\U0001F000-\U0001FAFF☀-⛿✀-➿️]')
    allowed = set('✕✓★')
    for f in ['index.html', 'css/app.css', 'js/app.js', 'js/data.js']:
        txt = open(os.path.join(ROOT, f), encoding='utf-8').read()
        found = sorted(set(c for c in emoji.findall(txt) if c not in allowed))
        check(f'keine Emojis in {f}', not found, ''.join(found))
        check(f'keine Schreibmaschinen-/Handschrift in {f}', not re.search('Courier|Typewriter|Marker Felt|Comic Sans', txt))
    data = open(os.path.join(ROOT, 'js/data.js'), encoding='utf-8').read()
    sw = open(os.path.join(ROOT, 'sw.js'), encoding='utf-8').read()
    v1 = re.search(r"APP_VERSION='([\d.]+)'", data).group(1)
    v2 = re.search(r"const VERSION = '([\d.]+)'", sw).group(1)
    check('Version in data.js und sw.js gleich', v1 == v2, f'{v1} / {v2}')
    md = open(os.path.join(ROOT, 'CHANGELOG.md'), encoding='utf-8').read()
    check('CHANGELOG.md enthält aktuelle Version', f'## {v1}' in md)
    for f in ['css/app.css', 'js/data.js', 'js/app.js', 'img/hero.svg']:
        check(f'Service Worker cached {f}', f"'./{f}'" in sw)

def browser_checks(p):
    errs = []
    b = p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 800}, accept_downloads=True)
    m = ctx.new_page(); m.on('pageerror', lambda e: errs.append('Moderator: ' + str(e)))
    store = lambda: m.evaluate("JSON.parse(localStorage.grosserPreis_v1)")
    scores = lambda: [t['score'] for t in store()['teams']]

    print('Startseite & Menüs')
    m.goto(URL); m.wait_for_timeout(400)
    check('Startseite sichtbar', m.locator('#home.show').count() == 1)
    m.click('#homeVer'); m.wait_for_timeout(200)
    check('Changelog öffnet', m.locator('#clDialog.show').count() == 1)
    check('Changelog ohne Datum', not re.search(r'\d{1,2}\.\d{1,2}\.\d{4}', m.inner_text('#clBody')))
    m.click('#clX')
    m.click('#gcPreis'); m.wait_for_timeout(200)
    labels = m.locator('#gmList .mbtn').all_inner_texts()
    check('Spielmenü-Einträge', labels == ['Neues Spiel mit aktuellem Spielbrett', 'Neues Spiel mit leerem Spielbrett', 'Vorlagen', 'Einstellungen'], labels)
    m.locator('.mbtn', has_text='Vorlagen').click(); m.wait_for_timeout(200)
    names = [n.strip() for n in m.locator('#tplList .trow .mbtn').all_inner_texts()]
    check('drei Standard-Vorlagen', names == ['Gemischtes Quiz', 'Bibel-Quiz', 'Weihnachtsquiz'], names)
    m.click('#btnTplBack')

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
    m.locator('.mcopt').nth(0).click(); m.locator('.mcopt').nth(1).click()
    check('MC: genau eine Antwort eingeloggt', m.locator('.mcopt.locked').count() == 1)
    m.click('#btnShowAnswer'); m.wait_for_timeout(1700)
    check('MC: richtig aufgedeckt', m.locator('.mcopt.right').count() == 1 and m.locator('.mcopt.wrong').count() == 0)
    # halbe Punktzahl an Gruppe C
    m.locator('#qOther .chip').nth(0).click(); m.locator('#halfPick .chip', has_text='Gruppe C').click(); m.wait_for_timeout(300)
    check('halbe Punktzahl', scores()[2] == 10, scores())
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
    v = pi.value; v.on('pageerror', lambda e: errs.append('Zuschauer: ' + str(e))); v.wait_for_timeout(1300)
    check('Zuschaueransicht verbunden', m.evaluate("document.body.classList.contains('mod')"))
    m.locator('.tile').nth(20).click(); m.wait_for_timeout(500)
    check('ACTION-Animation auf beiden Bildschirmen', m.locator('#actionFx.show').count() == 1 and v.locator('#actionFx.show').count() == 1)
    m.wait_for_timeout(1700)
    check('Beamer zeigt Frage nach Animation', v.locator('#qOverlay.show').count() == 1)
    m.locator('#halfPick .chip').nth(3).click(); m.click('#btnOk'); m.wait_for_timeout(500)
    check('Ergebnis-Animation auf beiden Bildschirmen', m.locator('#doneFx.show').count() == 1 and v.locator('#doneFx.show').count() == 1)
    m.wait_for_timeout(2800)
    m.locator('.tile').nth(1).click(); m.wait_for_timeout(400)
    check('Moderator sieht Lösung vorab', m.locator('#qAnswer').is_visible())
    check('Beamer sieht Lösung nicht', not v.locator('#qAnswer').is_visible())
    m.click('#btnShowAnswer'); m.wait_for_timeout(300)
    check('Beamer sieht Lösung nach Freigabe', v.locator('#qAnswer').is_visible())
    m.click('#qX'); m.wait_for_timeout(200)

    print('Siegerehrung')
    m.click('#btnFinish'); m.click('#dYes'); m.wait_for_timeout(500)
    check('Moderator: nur Knopf', m.locator('#endScreen.mod-only').count() == 1 and not m.locator('#ceremony').is_visible())
    v.wait_for_timeout(6000)
    check('Beamer: Sieger enthüllt', v.locator('#endTitle.on').count() == 1)
    m.click('#btnEndMenu'); m.wait_for_timeout(600)
    check('zurück zur Startseite', m.locator('#home.show').count() == 1)
    check('Beamer wieder im Startbild', v.locator('#vSplash.show').count() == 1)
    v.close(); m.wait_for_timeout(500)

    print('Vorlagen & Sicherung')
    m.click('#gcPreis')
    check('Sicherungs-Hinweis nach Änderung', m.locator('.backup-note').count() == 1)
    with m.expect_download() as di: m.locator('.backup-note .primary').click()
    path = os.path.join(ROOT, 'tests', '.sicherung.json'); di.value.save_as(path)
    backup = json.load(open(path, encoding='utf-8'))
    check('Sicherung enthält Spielbrett', backup.get('typ') == 'sicherung' and len(backup['spielbrett']['categories']) == 5)
    m.wait_for_timeout(200)
    check('Hinweis nach Sicherung weg', m.locator('.backup-note').count() == 0)
    m.locator('.mbtn', has_text='Vorlagen').click()
    m.locator('.ttools .btn', has_text='als Vorlage').click(); m.fill('#dInput', 'Testquiz'); m.click('#dYes'); m.wait_for_timeout(400)
    check('Nach Speichern wird Sicherung angeboten', 'Datei sichern' in m.inner_text('#dYes'))
    m.click('#dNo')
    check('eigene Vorlage gelistet', m.locator('.trow', has_text='Testquiz').count() == 1)
    m.locator('.trow', has_text='Testquiz').locator('.tdel').click(); m.click('#dYes'); m.wait_for_timeout(200)
    m.locator('.trow', has_text='Weihnachtsquiz').locator('.tdel').click(); m.click('#dYes'); m.wait_for_timeout(200)
    check('Löschen', m.locator('.trow', has_text='Testquiz').count() == 0 and m.locator('.trow', has_text='Weihnachtsquiz').count() == 0)
    m.set_input_files('#tplFile', path); m.wait_for_timeout(400)
    check('Sicherung einspielen', m.locator('.trow', has_text='Gesichertes Spielbrett').count() == 1)
    m.locator('.ttools .btn', has_text='wiederherstellen').click(); m.wait_for_timeout(200)
    check('Standard-Vorlagen wiederherstellen', m.locator('.trow', has_text='Weihnachtsquiz').count() == 1)
    m.locator('.trow', has_text='Weihnachtsquiz').locator('.mbtn').click(); m.click('#dYes'); m.wait_for_timeout(400)
    check('Weihnachtsquiz laden', 'Weihnachtsgeschichte' in m.inner_text('#board'))
    os.remove(path)

    print('Update-Hinweis')
    m.evaluate("localStorage.setItem('grosserPreis_seenVersion','1.0.0')"); m.reload(); m.wait_for_timeout(1100)
    check('„Was ist neu“ nach Update gefüllt', m.locator('#clDialog.show').count() == 1 and m.locator('#clBody li').count() > 3)

    check('keine JavaScript-Fehler', not errs, '; '.join(errs))
    b.close()

if __name__ == '__main__':
    httpd = serve()
    try:
        static_checks()
        with sync_playwright() as p:
            browser_checks(p)
    except Exception:
        traceback.print_exc(); results.append(('Testlauf ohne Absturz', False, ''))
    finally:
        httpd.shutdown()
    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)} von {len(results)} Prüfungen bestanden.')
    sys.exit(1 if failed else 0)
