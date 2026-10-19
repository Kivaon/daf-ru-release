"""Build the reviewed start index from the research report and full Sefaria snapshots.
Usage: python3 scripts/import-commentary-starts.py REPORT RESEARCH_DIRECTORY
No translations or semantic refs are rewritten. Unknown order stays absent.
"""
import json, pathlib, re, sys
report = json.loads(pathlib.Path(sys.argv[1]).read_text())
research = pathlib.Path(sys.argv[2])
normalize = lambda s: re.sub('[^א-ת]', '', re.sub('<[^>]*>', '', s))
sources = {}
for kind in ('Rashi', 'Tosafot'):
    corpus = json.loads((research / (kind + '-full.json')).read_text())
    for i, daf in enumerate(corpus['he']):
        for j, line in enumerate(daf):
            for n, text in enumerate(line):
                if isinstance(text, str) and normalize(text):
                    sources[f'{kind} on Nazir {i//2+1}{"ab"[i%2]}:{j+1}:{n+1}'] = normalize(text)
rows = report['results']
assert not report['issues'], 'Resolve ambiguous/missing starts before importing'
assert len({r['ref'] for r in rows}) == len(rows)
groups = {}
for row in rows:
    assert row['coverage'] >= .9 and row['ref'] in sources
    groups.setdefault((row['kind'], row['startPage'], row['startOffset']), []).append(row)
for group in groups.values():
    assert len({sources[r['ref']] for r in group}) == 1, 'Different texts cannot share one start automatically'
    assert len({r['candidateOrdinal'] for r in group}) == 1
for kind, page in {(r['kind'], r['startPage']) for r in rows}:
    group = sorted((key[2], value[0]['candidateOrdinal']) for key, value in groups.items() if key[:2] == (kind, page))
    assert [n for _, n in group] == list(range(1, len(group)+1))
index = {}
for r in rows:
    item = {'page': r['startPage'], 'kind': r['kind'].lower(), 'pagesSpanned': r['pagesSpanned']}
    # Extra Wikisource text on these two Rashi pages has not been fully resolved.
    # Keep the located page, but do not assert an exhaustive ordinal yet.
    if (r['kind'], r['startPage']) not in {('Rashi', '31b'), ('Rashi', '34a')}:
        item['ordinal'] = r['candidateOrdinal']
    index[r['ref']] = item
output = pathlib.Path(__file__).resolve().parent.parent / 'app/data/commentary-starts.json'
output.write_text(json.dumps({'Nazir': index}, ensure_ascii=False, indent=2) + '\n')
print(f'Imported {len(rows)} refs / {len(groups)} starts; unresolved Rashi order omitted on 31b and 34a.')
