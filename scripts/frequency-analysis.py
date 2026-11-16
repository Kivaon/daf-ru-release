#!/usr/bin/env python3
"""
Частотный анализ огласованного Талмуда Dicta (Gemara, вариант «малэ», CC BY-SA) для словаря daf-ru.

По файлам Dicta считает: сколько слов и разных написаний, какую долю текста закрывают самые частые
написания и основы, сколько у написаний огласовок (неоднозначность), какие устойчивые сочетания
повторяются (кандидаты в «формулы»). Тексты Sefaria не нужны: сопоставление с refs здесь не делается.

  python3 scripts/frequency-analysis.py --dicta-dir DIR --out analysis/frequency --commit <sha>

DIR — папка с файлами «<Трактат>.txt» (содержимое Dicta «<трактат>.combinedfullmaleh.txt»).
Одинаковые файлы (Meila и Meilah) считаются один раз.

Основы — грубая оценка: снимается одна цепочка приставок (ו ה ב כ ל מ ש ד, «קא»), если остаток есть в корпусе как
самостоятельное написание и сам встречается не реже 30% от всех форм, которые к нему отнесены (так отсекаются
окончания вроде «נים»). Суффиксы и спряжение не разбираются, поэтому число основ завышено, а слияния бывают ошибочными.
"""
import argparse
import collections
import csv
import gzip
import hashlib
import importlib.util
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("build_vocalized", os.path.join(HERE, "build-vocalized.py"))
_bv = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_bv)
letters, parse_dicta, MARKERS = _bv.letters, _bv.parse_dicta, _bv.MARKERS

SHOW = re.compile("[^֑-ׇא-ת'\"]")  # знаки вокруг слова при показе: оставляем буквы, огласовки, апостроф, кавычку
PREFIX_LETTERS = "והבכלמשד"
COVERAGE_STEPS = [100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000, 20000]


def prefix_chains():
    """Возможные приставки: цепочки из 1–3 букв (ו/ד/ש + буква, «קא») от длинных к коротким."""
    chains = {"קא", "דקא", "וקא", "דקמ", "וקמ"}
    for first in PREFIX_LETTERS:
        chains.add(first)
        for second in PREFIX_LETTERS:
            chains.add(first + second)
            for third in PREFIX_LETTERS:
                if first in "ודש" and second in "הבכלמ":
                    chains.add(first + second + third)
    return sorted(chains, key=lambda chain: (-len(chain), chain))


def stem_groups(counts, min_stem=3, min_count=3, min_own_share=0.3):
    """{написание: основа}. Основа — самый частый остаток после снятия одной цепочки приставок, если остаток
    сам есть в корпусе. Остаток, который чаще встречается внутри чужих форм, чем сам по себе
    (окончания вроде «נים», «ירה»), основой не считается."""
    chains = prefix_chains()
    banned = set()
    for _ in range(4):
        mapping = {}
        for form in counts:
            best, best_count = form, 0
            for chain in chains:
                if form.startswith(chain) and len(form) - len(chain) >= min_stem:
                    rest = form[len(chain):]
                    if rest not in banned and counts.get(rest, 0) >= min_count and counts[rest] > best_count:
                        best, best_count = rest, counts[rest]
            mapping[form] = best
        mapped = collections.Counter()
        for form, stem in mapping.items():
            mapped[stem] += counts[form]
        weak = {stem for stem, total in mapped.items() if stem != "" and counts[stem] < min_own_share * total}
        if not weak - banned:
            break
        banned |= weak
    return mapping


def coverage(values, steps):
    """Доля слов, закрытая самыми частыми значениями: {N: процент}. values — убывающий список частот."""
    total = sum(values)
    result, running, index = {}, 0, 0
    for step in steps:
        while index < min(step, len(values)):
            running += values[index]
            index += 1
        result[step] = round(running / total * 100, 1) if total else 0.0
    return result


def read_corpus(directory):
    """[(трактат, {сторона: [слова]})] без повторов файлов."""
    seen, corpus = {}, []
    for name in sorted(os.listdir(directory)):
        if not name.endswith(".txt"):
            continue
        with open(os.path.join(directory, name), "rb") as handle:
            raw = handle.read()
        digest = hashlib.sha256(raw).hexdigest()
        tractate = name[:-4]
        if digest in seen:
            print(f"пропущен {tractate}: файл совпадает с {seen[digest]}", file=sys.stderr)
            continue
        seen[digest] = tractate
        corpus.append((tractate, parse_dicta(raw.decode("utf-8"))))
    return corpus


def analyse(corpus, ngram_min=None):
    freq = collections.Counter()
    tractates = collections.defaultdict(set)
    vocal = collections.defaultdict(collections.Counter)
    per_tractate = {}
    where = collections.defaultdict(list)   # форма -> первые места (трактат, сторона, индекс)
    ngrams = {n: collections.Counter() for n in (2, 3, 4)}
    sides = 0
    for tractate, parsed in corpus:
        tokens_in = 0
        local = collections.Counter()
        for side, words in parsed.items():
            sides += 1
            keys = [letters(word) for word in words]
            for index, (word, key) in enumerate(zip(words, keys)):
                if not key:
                    continue
                freq[key] += 1
                local[key] += 1
                tokens_in += 1
                tractates[key].add(tractate)
                vocal[key][SHOW.sub("", word)] += 1
                if len(where[key]) < 40 and (not where[key] or where[key][-1][0] != tractate or len(where[key]) < 3):
                    where[key].append((tractate, side, index))
            clean = [key for key in keys if key]
            for n in (2, 3, 4):
                for start in range(len(clean) - n + 1):
                    ngrams[n][tuple(clean[start:start + n])] += 1
        per_tractate[tractate] = {"sides": len(parsed), "tokens": tokens_in, "spellings": len(local), "once": sum(1 for v in local.values() if v == 1)}
    return {"freq": freq, "tractates": tractates, "vocal": vocal, "per_tractate": per_tractate, "where": where, "ngrams": ngrams, "sides": sides}


def vocalization_stats(freq, vocal):
    total = sum(freq.values())
    ambiguous = [key for key in freq if len(vocal[key]) > 1]
    return {
        "spellings_with_several_vocalizations": len(ambiguous),
        "share_of_spellings_pct": round(len(ambiguous) / len(freq) * 100, 1),
        "share_of_tokens_pct": round(sum(freq[key] for key in ambiguous) / total * 100, 1),
        "vocalized_forms_total": sum(len(variants) for variants in vocal.values()),
    }


def build_summary(result, commit):
    freq = result["freq"]
    ranked = [count for _, count in freq.most_common()]
    mapping = stem_groups(freq)
    stems = collections.Counter()
    for form, count in freq.items():
        stems[mapping[form]] += count
    stem_ranked = [count for _, count in stems.most_common()]
    total = sum(ranked)
    once = sum(1 for count in ranked if count == 1)
    return {
        "source": {"repo": "Dicta-Israel-Center-for-Text-Analysis/Talmud-Bavli-with-Nikud", "commit": commit, "variant": "maleh", "license": "CC BY-SA"},
        "tractates": len(result["per_tractate"]),
        "sides": result["sides"],
        "tokens": total,
        "spellings": len(ranked),
        "spellings_once": once,
        "spellings_once_pct": round(once / len(ranked) * 100, 1),
        "tokens_in_spellings_once_pct": round(once / total * 100, 1),
        "coverage_by_spellings_pct": coverage(ranked, COVERAGE_STEPS),
        "stems_estimate": len(stem_ranked),
        "coverage_by_stems_pct": coverage(stem_ranked, COVERAGE_STEPS),
        "vocalization": vocalization_stats(freq, result["vocal"]),
        "per_tractate": result["per_tractate"],
    }, mapping, stems


def example(corpus_index, where_item, words_cache, span=4):
    tractate, side, index = where_item
    words = words_cache[(tractate, side)]
    start, end = max(0, index - span), min(len(words), index + span + 1)
    return f"{tractate} {side}: " + " ".join(SHOW.sub("", w) for w in words[start:end])


def write_outputs(result, corpus, commit, out, top_forms=5000, with_examples=3000):
    os.makedirs(out, exist_ok=True)
    summary, mapping, stems = build_summary(result, commit)
    freq, vocal, tractates = result["freq"], result["vocal"], result["tractates"]
    words_cache = {(tractate, side): words for tractate, parsed in corpus for side, words in parsed.items()}
    total = summary["tokens"]
    with open(os.path.join(out, "summary.json"), "w", encoding="utf-8") as handle:
        json.dump(summary, handle, ensure_ascii=False, indent=1)
    ranked = freq.most_common()
    with open(os.path.join(out, "top-forms.csv"), "w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["ранг", "написание", "стем", "встреч", "накопл_%", "трактатов", "огласовок", "огласованные_формы", "примеры"])
        running = 0
        for rank, (form, count) in enumerate(ranked[:top_forms], 1):
            running += count
            variants = "; ".join(f"{v} ×{n}" for v, n in vocal[form].most_common(3))
            samples = ""
            if rank <= with_examples:
                places = result["where"][form]
                chosen, seen = [], set()
                for place in places:
                    if place[0] not in seen:
                        chosen.append(place); seen.add(place[0])
                    if len(chosen) == 2:
                        break
                samples = " | ".join(example(corpus, place, words_cache) for place in chosen)
            writer.writerow([rank, form, mapping[form], count, round(running / total * 100, 2), len(tractates[form]), len(vocal[form]), variants, samples])
    with open(os.path.join(out, "top-stems.csv"), "w", encoding="utf-8", newline="") as handle:
        members = collections.defaultdict(list)
        for form, count in ranked:
            members[mapping[form]].append((form, count))
        writer = csv.writer(handle)
        writer.writerow(["ранг", "стем", "встреч", "накопл_%", "форм", "частые_формы"])
        running = 0
        for rank, (stem, count) in enumerate(stems.most_common(top_forms), 1):
            running += count
            writer.writerow([rank, stem, count, round(running / total * 100, 2), len(members[stem]), "; ".join(f"{f} ×{n}" for f, n in members[stem][:6])])
    ngram_rows = []
    for n, counter in result["ngrams"].items():
        floor = {2: 80, 3: 25, 4: 15}[n]
        for gram, count in counter.most_common(600):
            if count >= floor:
                ngram_rows.append((n, " ".join(gram), count))
    with open(os.path.join(out, "top-ngrams.csv"), "w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["слов", "сочетание", "встреч"])
        writer.writerows(sorted(ngram_rows, key=lambda row: (-row[2], row[0])))
    with open(os.path.join(out, "per-tractate.csv"), "w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["трактат", "сторон", "слов", "написаний", "написаний_1_раз"])
        for tractate, data in sorted(summary["per_tractate"].items()):
            writer.writerow([tractate, data["sides"], data["tokens"], data["spellings"], data["once"]])
    with gzip.open(os.path.join(out, "all-forms.csv.gz"), "wt", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["написание", "встреч", "трактатов", "огласованные_формы"])
        for form, count in ranked:
            writer.writerow([form, count, len(tractates[form]), "; ".join(f"{v} ×{c}" for v, c in vocal[form].most_common())])
    return summary


def render_markdown(summary):
    lines = [
        "# Частотный анализ огласованного Талмуда Dicta",
        "",
        f"Источник: {summary['source']['repo']}, коммит `{summary['source']['commit'][:7]}`, вариант «малэ», лицензия {summary['source']['license']}. Только Гемара.",
        "",
        f"- Трактатов: {summary['tractates']}, сторон листа: {summary['sides']}, слов: {summary['tokens']:,}".replace(",", " "),
        f"- Разных написаний: {summary['spellings']:,}; из них один раз: {summary['spellings_once']:,} ({summary['spellings_once_pct']}%), это {summary['tokens_in_spellings_once_pct']}% слов текста".replace(",", " "),
        f"- Основ (грубая оценка по приставкам): {summary['stems_estimate']:,}".replace(",", " "),
        "",
        "## Какую долю текста закрывают самые частые",
        "",
        "| Первые N | написаний, % слов | основ, % слов |",
        "|---:|---:|---:|",
    ]
    for step in COVERAGE_STEPS:
        lines.append(f"| {step} | {summary['coverage_by_spellings_pct'][step]} | {summary['coverage_by_stems_pct'][step]} |")
    vocalization = summary["vocalization"]
    lines += [
        "",
        "## Огласовки",
        "",
        f"- Огласованных форм: {vocalization['vocalized_forms_total']:,}".replace(",", " "),
        f"- Написаний с несколькими огласовками: {vocalization['spellings_with_several_vocalizations']:,} ({vocalization['share_of_spellings_pct']}% написаний, {vocalization['share_of_tokens_pct']}% слов текста)".replace(",", " "),
        "",
        "Файлы рядом: `top-forms.csv`, `top-stems.csv`, `top-ngrams.csv`, `per-tractate.csv`, `all-forms.csv.gz`, `summary.json`.",
        "",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dicta-dir", required=True)
    parser.add_argument("--out", default="analysis/frequency")
    parser.add_argument("--commit", default="")
    args = parser.parse_args()
    corpus = read_corpus(args.dicta_dir)
    result = analyse(corpus)
    summary = write_outputs(result, corpus, args.commit, args.out)
    with open(os.path.join(args.out, "summary.md"), "w", encoding="utf-8") as handle:
        handle.write(render_markdown(summary))
    print(render_markdown(summary))


if __name__ == "__main__":
    main()
