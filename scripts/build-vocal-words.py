#!/usr/bin/env python3
"""
Слова огласованного Талмуда Dicta по трактатам для сопоставления в приложении (public/vocal/words/<Трактат>.json).

Приложение само сопоставляет эти слова с живым текстом Sefaria (app/vocalAlign.ts), поэтому файлам Sefaria не нужен.
Метки «גמ'/מתני'» отдельных строк в слова не входят, границы сторон сохраняются.

  python3 scripts/build-vocal-words.py --dicta-dir DIR --out public/vocal/words --commit <sha> Berakhot Avoda_Zara="Avodah Zarah" ...

DIR — папка с файлами «<Имя у Dicta>.txt» (содержимое «<трактат>.combinedfullmaleh.txt» из репозитория Dicta).
Аргумент «Имя_у_Dicta=Имя в Sefaria» нужен, если названия различаются; файл называется по имени в Sefaria с «_» вместо пробела
(так его ищет приложение). Без «=» имя берётся одно и то же.
"""
import argparse
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("build_vocalized", os.path.join(HERE, "build-vocalized.py"))
_bv = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_bv)

CREDIT = _bv.CREDIT


def side_order(key):
    return (int(key[:-1]), key[-1])


def build(tractate, text, commit):
    sides = _bv.parse_dicta(text)
    ordered = sorted(sides, key=side_order)
    return {
        "v": 1, "tractate": tractate, "dicta": {"commit": commit, "variant": "maleh", "license": "CC BY-SA", "credit": CREDIT},
        "order": ordered,
        "sides": {key: [word for word in sides[key] if _bv.letters(word)] for key in ordered},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dicta-dir", required=True)
    parser.add_argument("--out", default="public/vocal/words")
    parser.add_argument("--commit", default="")
    parser.add_argument("tractates", nargs="+")
    args = parser.parse_args()
    os.makedirs(args.out, exist_ok=True)
    for item in args.tractates:
        source, _, tractate = item.partition("=")
        tractate = tractate or source
        with open(os.path.join(args.dicta_dir, f"{source}.txt"), encoding="utf-8") as handle:
            document = build(tractate, handle.read(), args.commit)
        path = os.path.join(args.out, f"{tractate.replace(' ', '_')}.json")
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(document, handle, ensure_ascii=False, separators=(",", ":"))
        words = sum(len(w) for w in document["sides"].values())
        print(f"{tractate}: сторон {len(document['order'])}, слов {words}, файл {os.path.getsize(path)} байт", file=sys.stderr)


if __name__ == "__main__":
    main()
