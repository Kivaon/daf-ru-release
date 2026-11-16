"""Проверки частотного анализа на маленьком синтетическом тексте (без файлов Dicta).

  python3 -m unittest scripts/test_frequency_analysis.py
"""
import collections
import importlib.util
import os
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("frequency_analysis", os.path.join(HERE, "frequency-analysis.py"))
fa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fa)

SAMPLE = """
 *** דף ב. ***

מַתְנִי'
אָמַר רַב אָמַר לֵיהּ קָא מַשְׁמַע לַן
דְּאָמַר רַב וְלֹא אָמַר
 *** דף ב: ***

אָמַר רַבִּי קָא מַשְׁמַע לַן
"""


class FrequencyAnalysis(unittest.TestCase):
    def corpus(self, text=SAMPLE):
        with tempfile.TemporaryDirectory() as folder:
            with open(os.path.join(folder, "Test.txt"), "w", encoding="utf-8") as handle:
                handle.write(text)
            with open(os.path.join(folder, "Copy.txt"), "w", encoding="utf-8") as handle:
                handle.write(text)
            return fa.read_corpus(folder)

    def test_identical_files_are_counted_once_and_markers_are_not_words(self):
        corpus = self.corpus()
        self.assertEqual([name for name, _ in corpus], ["Copy"])
        sides = corpus[0][1]
        self.assertEqual(sorted(sides), ["2a", "2b"])
        self.assertNotIn("מַתְנִי'", sides["2a"])

    def test_counts_spellings_and_vocal_forms(self):
        result = fa.analyse(self.corpus())
        freq = result["freq"]
        self.assertEqual(freq["אמר"], 4)
        self.assertEqual(sorted(result["vocal"]["אמר"]), ["אָמַר"])
        self.assertEqual(freq["קא"], 2)
        self.assertEqual(result["per_tractate"]["Copy"]["sides"], 2)

    def test_ngrams_do_not_cross_a_side_boundary(self):
        result = fa.analyse(self.corpus())
        self.assertEqual(result["ngrams"][3][("קא", "משמע", "לן")], 2)
        self.assertEqual(result["ngrams"][2][("אמר", "רב")], 1)
        self.assertNotIn(("לא", "אמר", "אמר"), result["ngrams"][3])

    def test_coverage_is_the_share_of_words_closed_by_the_top_values(self):
        self.assertEqual(fa.coverage([50, 30, 20], [1, 2, 3, 10]), {1: 50.0, 2: 80.0, 3: 100.0, 10: 100.0})
        self.assertEqual(fa.coverage([], [1]), {1: 0.0})

    def test_stems_strip_one_prefix_chain_and_reject_fragments(self):
        counts = collections.Counter({"אמר": 100, "דאמר": 20, "ואמר": 10, "נים": 4, "שנים": 50, "כהנים": 40, "בנים": 30})
        mapping = fa.stem_groups(counts)
        self.assertEqual(mapping["דאמר"], "אמר")
        self.assertEqual(mapping["ואמר"], "אמר")
        # «נים» — окончание: само по себе встречается редко, поэтому основой не становится
        self.assertEqual(mapping["שנים"], "שנים")
        self.assertEqual(mapping["כהנים"], "כהנים")
        # слишком короткий остаток не считается основой
        self.assertEqual(fa.stem_groups(collections.Counter({"הוא": 50, "ההוא": 5}))["ההוא"], "הוא")
        self.assertEqual(fa.stem_groups(collections.Counter({"את": 50, "דאת": 5}))["דאת"], "דאת")

    def test_vocalization_statistics(self):
        result = fa.analyse(self.corpus("*** דף ב. ***\nאָמַר אֲמַר אָמַר רַב\n"))
        stats = fa.vocalization_stats(result["freq"], result["vocal"])
        self.assertEqual(stats["spellings_with_several_vocalizations"], 1)
        self.assertEqual(stats["share_of_spellings_pct"], 50.0)
        self.assertEqual(stats["share_of_tokens_pct"], 75.0)
        self.assertEqual(stats["vocalized_forms_total"], 3)

    def test_output_files_are_written_and_the_summary_is_consistent(self):
        corpus = self.corpus()
        result = fa.analyse(corpus)
        with tempfile.TemporaryDirectory() as out:
            summary = fa.write_outputs(result, corpus, "abc1234", out)
            for name in ("summary.json", "top-forms.csv", "top-stems.csv", "top-ngrams.csv", "per-tractate.csv", "all-forms.csv.gz"):
                self.assertTrue(os.path.exists(os.path.join(out, name)), name)
        self.assertEqual(summary["tokens"], sum(result["freq"].values()))
        self.assertEqual(summary["spellings"], len(result["freq"]))
        self.assertEqual(summary["coverage_by_spellings_pct"][100], 100.0)
        self.assertIn("Частотный анализ", fa.render_markdown(summary))


if __name__ == "__main__":
    unittest.main()
