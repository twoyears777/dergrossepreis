#!/usr/bin/env python3
"""Listet die Spiele, die seit der letzten Version neu in spiele/ dazugekommen sind.

Gedacht für ein Release: die Namen kommen als eine Zeile in den Changelog,
z. B. „Neue Spiele in der Spielesammlung: A, B, C“.
Als „letzte Version“ gilt der letzte Commit, der APP_VERSION in js/data.js geändert hat.

    python tools/neue-spiele.py
"""
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
git = lambda *a: subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=True, check=True).stdout

def name_of(text):
    m = re.search(r'^Name:\s*(.+)$', text, re.M)
    return m.group(1).strip() if m else None

def names_at(rev):
    out = {}
    for f in git('ls-tree', '--name-only', rev, 'spiele/').split():
        if f.endswith('.txt'):
            n = name_of(git('show', f'{rev}:{f}'))
            if n: out[n.lower()] = n
    # bis Version 1.17.1 standen die Spiele noch in js/data.js (GAMES)
    data = git('show', f'{rev}:js/data.js')
    if 'const GAMES=[' in data:
        for n in re.findall(r"^\s+name:'(.+?)',\s*$", data.split('const GAMES=[', 1)[1], re.M):
            out[n.lower()] = n
    return out

def names_now():
    out, d = {}, os.path.join(ROOT, 'spiele')
    for f in sorted(os.listdir(d)):
        if f.endswith('.txt'):
            n = name_of(open(os.path.join(d, f), encoding='utf-8').read())
            if n: out[n.lower()] = n
    return out

rev = git('log', '-n1', '--format=%H', "-GAPP_VERSION='", '--', 'js/data.js').strip()
if not rev:
    sys.exit('Keine frühere Version gefunden.')
alt, neu = names_at(rev), names_now()
liste = sorted((neu[k] for k in neu if k not in alt), key=str.lower)
ver = re.search(r"APP_VERSION='([\d.]+)'", git('show', f'{rev}:js/data.js'))
print(f'Seit Version {ver.group(1) if ver else rev[:7]}:')
print('Neue Spiele in der Spielesammlung: ' + ', '.join(liste) if liste else 'Keine neuen Spiele.')
