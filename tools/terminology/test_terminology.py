#!/usr/bin/env python3
"""Unit tests for the terminology pipelines, on the small synthetic fixtures in tools/terminology/fixtures/.

    python3 -m unittest tools.terminology.test_terminology     (from the repository root)
    python3 tools/terminology/test_terminology.py

The fixtures follow the official file formats (LOINC Loinc.csv columns; RxNorm RRF pipe-delimited rows) with a handful of
records, so the pipelines can be exercised without a licensed release. Nothing here is real release data.
"""
import json, os, sys, tempfile, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common, loinc, rxnorm
FIX = os.path.join(HERE, "fixtures")

class LoincTests(unittest.TestCase):
    def setUp(self):
        self.rows = list(common.read_delimited(os.path.join(FIX, "loinc-sample.csv")))
        self.panels = list(common.read_delimited(os.path.join(FIX, "panels-sample.csv")))
        self.concepts, self.records, self.stats = loinc.ingest(self.rows, self.panels)
        self.by_id = {c["id"]: c for c in self.concepts}

    def test_variants_are_deduplicated_into_one_concept(self):
        creat = [c for c in self.concepts if c["component"] == "Creatinine"]
        self.assertEqual(len(creat), 1, "mass, molar and Jaffe-method creatinine records must collapse into one canonical concept")
        self.assertEqual(sorted(creat[0]["codes"]), ["14682-9", "2160-0", "2161-8"])
        self.assertFalse(creat[0]["deprecated"], "a concept with an active variant is not deprecated")

    def test_deprecated_records_are_flagged(self):
        self.assertEqual(self.records["99999-9"]["status"], "DEPRECATED")
        widget = next(c for c in self.concepts if c["component"] == "Widget factor")
        self.assertTrue(widget["deprecated"])
        self.assertEqual(self.stats["deprecated"], 2)   # DEPRECATED + DISCOURAGED

    def test_specimen_method_and_category_mapping(self):
        creat = next(c for c in self.concepts if c["component"] == "Creatinine")
        self.assertEqual(creat["specimen"], "serum-or-plasma")
        self.assertIn("chemistry-metabolic", creat["categories"])
        cbc = next(c for c in self.concepts if c["component"] == "CBC panel")
        self.assertTrue(cbc["isPanel"]); self.assertIn("blood-haematology", cbc["categories"]); self.assertIn("automated-cell-count", cbc["methods"])

    def test_panel_components_from_panels_file(self):
        self.assertEqual(self.records["58410-2"].get("components"), ["718-7"])
        self.assertEqual(self.stats["panelLinks"], 1)

    def test_synonyms_and_abbreviations(self):
        hb = next(c for c in self.concepts if c["component"] == "Hemoglobin")
        self.assertIn("Hgb", hb["abbreviations"]); self.assertTrue(any("Haemoglobin" in s for s in hb["synonyms"]))

    def test_matching_against_the_site_catalogue(self):
        idx = common.site_index()
        queues = loinc.match_concepts(self.concepts, idx)
        creat = next(c for c in self.concepts if c["component"] == "Creatinine")
        self.assertIn("matches", creat, "creatinine must resolve to a page or catalogue concept on this site")
        fict = next(c for c in self.concepts if c["component"] == "Fictitious protein")
        self.assertNotIn("matches", fict)
        self.assertTrue(any(q["concept"] == fict["id"] for q in queues["unmatched"]), "an unmatched active concept goes to the review queue")

    def test_verification_of_asserted_codes(self):
        verified, problems = loinc.verify(self.records, {"loinc": {"2160-0": ["tests/creatinine-egfr"], "2161-8": ["tests/x"], "00000-0": ["tests/y"]}})
        self.assertIn("2160-0", verified)
        self.assertTrue(any("2161-8" in p and "DISCOURAGED" in p for p in problems))
        self.assertTrue(any("00000-0" in p and "not in the release" in p for p in problems))

    def test_cli_writes_candidates_and_queues(self):
        with tempfile.TemporaryDirectory() as tmp:
            rc = loinc.main(["--loinc-csv", os.path.join(FIX, "loinc-sample.csv"), "--panels", os.path.join(FIX, "panels-sample.csv"), "--out", tmp, "--release", "test"])
            cand = json.load(open(os.path.join(tmp, "loinc-candidates.json")))
            self.assertEqual(cand["release"], "test"); self.assertGreaterEqual(len(cand["concepts"]), 5)
            self.assertTrue(os.path.exists(os.path.join(tmp, "loinc-queues.json")))
            self.assertIn(rc, (0, 1))

class RxNormTests(unittest.TestCase):
    def setUp(self):
        conso = list(common.read_rrf(os.path.join(FIX, "RXNCONSO.RRF"), rxnorm.RXNCONSO))
        rel = list(common.read_rrf(os.path.join(FIX, "RXNREL.RRF"), rxnorm.RXNREL))
        self.ing, self.combos, self.names, self.tty, self.stats = rxnorm.ingest(conso, rel)
        rxnorm.attach_dose_forms(self.ing, self.names, self.tty, rel)

    def test_ingredients_brands_variants_and_codes(self):
        a = self.ing["17767"]
        self.assertEqual(a["name"], "amlodipine")
        self.assertEqual(a["brands"], ["Norvasc"])
        self.assertEqual(a["variants"], ["amlodipine besylate"])
        self.assertEqual(a["atc"], ["C08CA01"])
        self.assertEqual(a["fdaEpc"], ["Dihydropyridine Calcium Channel Blocker [EPC]"])
        self.assertEqual(a["doseForms"], ["tablet"]); self.assertEqual(a["routes"], ["oral"])

    def test_combination_products_list_every_ingredient(self):
        c = self.combos["214153"]
        self.assertEqual(sorted(c["ingredients"]), ["17767", "83367"])

    def test_obsolete_concepts_are_detected(self):
        self.assertTrue(self.ing["10000"]["obsolete"]); self.assertEqual(self.stats["obsolete"], 1)

    def test_matching_and_verification(self):
        idx = common.site_index()
        queues, verified, problems = rxnorm.match_and_verify(self.ing, self.combos, idx, {"rxnorm": {"17767": ["medications/amlodipine"], "424242": ["medications/nothing"]}, "atc": {"C08CA01": ["medications/amlodipine"], "C08": ["classes/calcium-channel-blockers"], "Z99ZZ99": ["medications/x"]}, "fdaEpc": {"Dihydropyridine Calcium Channel Blocker [EPC]": ["medications/amlodipine"], "Made Up Class [EPC]": ["medications/x"]}})
        self.assertEqual(self.ing["17767"]["matches"]["id"], "amlodipine")
        self.assertIn("17767", verified["rxnorm"]); self.assertIn("C08CA01", verified["atc"]); self.assertIn("C08", verified["atc"])
        self.assertTrue(any("424242" in p for p in problems)); self.assertTrue(any("Z99ZZ99" in p for p in problems)); self.assertTrue(any("Made Up Class" in p for p in problems))
        self.assertTrue(any(q["name"] == "zzz-obsoletamine" for q in queues.get("unmatched_ingredient", [])) is False, "obsolete ingredients are not candidates")

    def test_cli(self):
        with tempfile.TemporaryDirectory() as tmp:
            rc = rxnorm.main(["--rrf-dir", FIX, "--out", tmp, "--release", "test"])
            cand = json.load(open(os.path.join(tmp, "rxnorm-candidates.json")))
            self.assertEqual(cand["stats"]["ingredients"], 4)
            self.assertIn(rc, (0, 1))

class CommonTests(unittest.TestCase):
    def test_norm_matches_compiler_normalisation(self):
        self.assertEqual(common.norm("Haemoglobin (Hb) – blood"), "haemoglobin hb blood")
    def test_site_index_knows_catalogue_pages_and_medicines(self):
        idx = common.site_index()
        self.assertEqual(idx.match(["Complete blood count"])[0] in ("tests", "concept"), True)
        self.assertEqual(idx.match(["amlodipine besylate"]), ("medications", "amlodipine"))
        self.assertIsNone(idx.match(["no such thing at all"]))
    def test_asserted_codes_are_collected(self):
        codes = common.asserted_codes()
        self.assertIn("2160-0", codes["loinc"]); self.assertIn("17767", codes["rxnorm"]); self.assertIn("C08CA01", codes["atc"])

if __name__ == "__main__":
    unittest.main()
