#!/usr/bin/env python3
"""
Огласованный текст Гемары для daf-ru (тестовая ветка).

Сопоставляет слова огласованного Талмуда Dicta (CC BY-SA, вариант «малэ») со словами
реплик Sefaria (версия Wikisource Talmud Bavli, CC-BY-SA) и пишет по файлу на сторону листа:
public/vocal/<Трактат>/<сторона>.json. Источники только читаются; тексты не правятся.

Правило: текст и огласовки Гемары берутся из Dicta, Sefaria даёт refs и границы реплик.
  eq   слово совпало, берётся огласованная форма Dicta
  var  небольшое отличие написания, берётся слово Dicta
  ab   сокращение Sefaria (אע"פ, קמ"ל), берутся развёрнутые слова Dicta
  sub  короткая замена другого слова или слов (≤3 подряд, например «עובד כוכבים» → «נָכְרִי»),
       берутся слова Dicta; идёт в журнал
  sef  слово есть только у Sefaria (обычно «גמ׳/מתני׳»), показывается как есть, без огласовок
  dic  слово есть только у Dicta, вставляется после предыдущего слова реплики
  cite ссылка на источник в скобках у Sefaria — в тексте Dicta её нет, показывается как есть
Сторона помечается use="plain" (без огласовок), если доля eq+var+ab+sub среди слов Гемары ниже порога
(метки «גמ׳/מתני׳» и ссылки на источники в скобках у Sefaria в счёт не идут).

Запуск (Sefaria-тексты сохранены заранее, у скриптов Sefaria блокирует доступ):
  python3 scripts/build-vocalized.py --sefaria sef_inputs.json \
      --dicta Berakhot=berakhot_maleh.txt --dicta Bekhorot=bekhorot_maleh.txt \
      --commit <sha> --out public/vocal --log vocal_log.csv
"""
import argparse
import csv
import difflib
import json
import os
import re
import sys

NIQQUD = re.compile("[֑-ׇ]")
HEB = re.compile("[^א-ת]")
ABBR_MARKS = "'\"׳״"
MARKERS = {"גמ", "מתני", "משנה"}
MARGIN = 30
THRESHOLD = 0.98
CREDIT = "Этот текст Вавилонского Талмуда огласован Dicta, Израильским центром анализа текстов (www.dicta.org.il)."

VALUES = {c: v for c, v in zip("אבגדהוזחטיכלמנסעפצקרשת", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400])}
VALUES.update({"ך": 20, "ם": 40, "ן": 50, "ף": 80, "ץ": 90})


def letters(text):
    return HEB.sub("", NIQQUD.sub("", text))


def fnv1a(text):
    h = 0x811C9DC5
    for ch in text:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def signature(text):
    only = letters(text)
    return fnv1a(only), len(only)


def hebrew_number(text):
    return sum(VALUES.get(ch, 0) for ch in text)


def parse_dicta(text):
    """{'2a': [слова...]} без меток «גמ'/מתני'» (отдельные строки из одного слова)."""
    sides, key = {}, None
    for line in text.splitlines():
        header = re.match(r"\s*\*\*\* דף (\S+?)([.:]) \*\*\*\s*$", line)
        if header:
            key = f"{hebrew_number(header.group(1))}{'a' if header.group(2) == '.' else 'b'}"
            sides[key] = []
            continue
        if key is None:
            continue
        words = line.split()
        if len(words) == 1 and letters(words[0]) in MARKERS:
            continue
        sides[key].extend(words)
    return sides


def split_punct(raw):
    lead = re.match(r"^[^א-ת]*", raw).group(0)
    trail = re.search(r"[^א-ת]*$", raw).group(0)
    return lead, trail


def similar(a, b):
    return difflib.SequenceMatcher(None, a, b).ratio() >= 0.7


def expand_abbreviation(token_letters, dicta_words, start):
    """Сколько слов Dicta разворачивают сокращение: первые буквы слов == буквам сокращения."""
    if len(token_letters) == 1 and start < len(dicta_words) and letters(dicta_words[start]).startswith(token_letters):
        return 1
    for count in range(2, 5):
        group = dicta_words[start:start + count]
        if len(group) == count and "".join(letters(w)[:1] for w in group) == token_letters:
            return count
    return 0


def has_abbr(raw):
    return any(mark in raw for mark in ABBR_MARKS)


def shown(raw, word, strip=False):
    """Слово Dicta со знаками препинания, стоявшими вокруг слова в тексте Sefaria."""
    lead, trail = split_punct(raw)
    return f"{lead}{word}{trail.lstrip(ABBR_MARKS) if strip else trail}"


def align_side(segments, dicta_words, margin_before, margin_after):
    """Возвращает (segments_out, counters, log)."""
    tokens = []  # (seg, raw, letters)
    for seg_index, text in enumerate(segments, 1):
        for raw in text.split():
            tokens.append((seg_index, raw, letters(raw)))
    real = [i for i, t in enumerate(tokens) if t[2]]
    s_norm = [tokens[i][2] for i in real]
    d_all = margin_before + dicta_words + margin_after
    d_norm = [letters(w) for w in d_all]
    cut_a, cut_b = len(margin_before), len(margin_before) + len(dicta_words)
    kind = {}      # индекс в tokens -> (тип, показываемый текст или None)
    inserts = {}   # индекс в tokens (или -1) -> [слова Dicta после него]
    inside = lambda j: cut_a <= j < cut_b

    def attach_insert(after_real, word, j):
        if inside(j):
            inserts.setdefault(real[after_real] if after_real >= 0 else -1, []).append(word)

    matcher = difflib.SequenceMatcher(None, s_norm, d_norm, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                kind[real[i1 + k]] = ("eq", shown(tokens[real[i1 + k]][1], d_all[j1 + k]))
        elif tag == "delete":
            for k in range(i1, i2):
                kind[real[k]] = ("sef", None)
        elif tag == "insert":
            for k in range(j1, j2):
                attach_insert(i1 - 1, d_all[k], k)
        elif i2 - i1 == j2 - j1:  # замена один к одному
            n = i2 - i1
            for k in range(n):
                idx, raw = real[i1 + k], tokens[real[i1 + k]][1]
                a, b = s_norm[i1 + k], d_norm[j1 + k]
                word = d_all[j1 + k]
                if has_abbr(raw) and b.startswith(a):
                    kind[idx] = ("ab", shown(raw, word, True))
                elif similar(a, b):
                    kind[idx] = ("var", shown(raw, word))
                elif n <= 3:
                    kind[idx] = ("sub", shown(raw, word, True))
                else:
                    kind[idx] = ("sef", None)
                    attach_insert(i1 + k, word, j1 + k)
        else:  # разная длина: сначала сокращения, остаток коротких блоков заменяется целиком
            j, rest_s = j1, []
            for k in range(i1, i2):
                raw = tokens[real[k]][1]
                count = expand_abbreviation(s_norm[k], d_all, j) if has_abbr(raw) else 0
                if count and j + count <= j2:
                    kind[real[k]] = ("ab", shown(raw, " ".join(d_all[j:j + count]), True))
                    j += count
                else:
                    rest_s.append(k)
            rest_d = list(range(j, j2))
            if rest_s and rest_d and len(rest_s) <= 3 and len(rest_d) <= 3:
                first, last = tokens[real[rest_s[0]]][1], tokens[real[rest_s[-1]]][1]
                lead = split_punct(first)[0]
                trail = split_punct(last)[1].lstrip(ABBR_MARKS)
                kind[real[rest_s[0]]] = ("sub", f"{lead}{' '.join(d_all[x] for x in rest_d)}{trail}")
                for k in rest_s[1:]:
                    kind[real[k]] = ("sub", "")
            else:
                for k in rest_s:
                    kind[real[k]] = ("sef", None)
                for x in rest_d:
                    attach_insert(i2 - 1, d_all[x], x)

    # Служебные метки «גמ׳/מתני׳» в начале реплики остаются как у Sefaria, без огласовок
    first_of_segment = {}
    for idx, (seg, raw, lt) in enumerate(tokens):
        first_of_segment.setdefault(seg, idx)
    for idx in first_of_segment.values():
        if tokens[idx][2] in MARKERS:
            kind[idx] = ("sef", None)

    out = {i: [] for i in range(1, len(segments) + 1)}
    counts = {"eq": 0, "var": 0, "ab": 0, "sub": 0, "sef": 0, "dic": 0, "cite": 0}
    log = []
    in_paren = False

    def emit_inserts(idx, seg):
        for word in inserts.get(idx, []):
            out[seg].append([word, word, "dic"])
            counts["dic"] += 1
            log.append(("dic", "", word))

    emit_inserts(-1, 1)
    for idx, (seg, raw, lt) in enumerate(tokens):
        if raw.startswith("("):
            in_paren = True
        typ, display = kind.get(idx, ("sef", None))
        if not lt:  # знак без букв: остаётся как есть
            out[seg].append([raw, None, "sef"])
        elif display is None:
            if in_paren:  # ссылка на источник в скобках у Sefaria: не слово Гемары
                out[seg].append([raw, None, "cite"])
                counts["cite"] += 1
            else:
                out[seg].append([raw, None, "sef"])
                counts["sef"] += 1
                log.append(("sef", raw, ""))
        else:
            out[seg].append([raw, display, typ])
            counts[typ] += 1
            if typ != "eq":
                log.append((typ, raw, display))
        if raw.endswith(")"):
            in_paren = False
        emit_inserts(idx, seg)
    return out, counts, log


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sefaria", required=True, help="JSON {'Трактат/сторона': {version, license, he:[реплики]}}")
    parser.add_argument("--dicta", action="append", default=[], help="Трактат=файл (вариант «малэ»), можно несколько")
    parser.add_argument("--commit", default="", help="хеш коммита Dicta")
    parser.add_argument("--out", default="public/vocal")
    parser.add_argument("--log", default="")
    parser.add_argument("--threshold", type=float, default=THRESHOLD)
    args = parser.parse_args()
    dicta = {}
    for item in args.dicta:
        name, path = item.split("=", 1)
        with open(path, encoding="utf-8") as handle:
            dicta[name] = parse_dicta(handle.read())
    with open(args.sefaria, encoding="utf-8") as handle:
        sefaria = json.load(handle)
    rows, summary = [], []
    for key, data in sefaria.items():
        tractate, side = key.split("/")
        sides = dicta.get(tractate)
        if sides is None or side not in sides:
            print(f"{key}: нет текста Dicta", file=sys.stderr)
            continue
        order = list(sides)
        pos = order.index(side)
        before = sides[order[pos - 1]][-MARGIN:] if pos > 0 else []
        after = sides[order[pos + 1]][:MARGIN] if pos + 1 < len(order) else []
        page = side
        segments_out, counts, log = align_side(data["he"], sides[side], before, after)
        total = counts["eq"] + counts["var"] + counts["ab"] + counts["sub"] + counts["sef"]
        # «sef» считаем без технических меток «גמ׳/מתני׳» в начале реплики
        marker_count = sum(1 for seg in segments_out.values() for raw, d, t in seg if t == "sef" and d is None and letters(raw) in MARKERS)
        words = total - marker_count
        matched = counts["eq"] + counts["var"] + counts["ab"] + counts["sub"]
        share = matched / words if words else 0
        use = "vocalized" if share >= args.threshold else "plain"
        document = {
            "v": 1, "tractate": tractate, "side": side,
            "dicta": {"commit": args.commit, "variant": "maleh", "license": "CC BY-SA", "credit": CREDIT},
            "sefaria": {"version": data.get("version", ""), "license": data.get("license", "")},
            "stats": {**counts, "markers": marker_count, "words": words, "match": round(share, 4)},
            "use": use,
            "segments": {},
        }
        for seg_index, text in enumerate(data["he"], 1):
            sig, count = signature(text)
            document["segments"][f"{page}:{seg_index}"] = {"sig": sig, "n": count, "w": segments_out[seg_index]}
        folder = os.path.join(args.out, tractate)
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, f"{side}.json"), "w", encoding="utf-8") as handle:
            json.dump(document, handle, ensure_ascii=False, separators=(",", ":"))
        summary.append((key, document["stats"], use))
        rows.extend((key, typ, raw, word) for typ, raw, word in log)
    for key, stats, use in summary:
        print(key, json.dumps(stats, ensure_ascii=False), use)
    if args.log:
        with open(args.log, "w", encoding="utf-8", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["лист", "тип", "Sefaria", "Dicta"])
            writer.writerows(rows)


if __name__ == "__main__":
    main()
