#!/usr/bin/env python3
"""classify.py — build the Human Atlas source manifest from BodyParts3D tables.

Inputs
  --bp3d DIR   BodyParts3D 4.0 is-a release: isa_BP3D_4.0_obj_99/*.obj + isa_element_parts.txt + isa_parts_list_e.txt
  --bp3d30 DIR BodyParts3D 3.0 tables: conventional_part_of.txt (part-of tree used for organ-system membership)
Outputs
  manifest/atlas-source.json  pieces, systems, concepts (input for build-atlas.mjs and the viewer)
  manifest/review.txt         every piece grouped by system with the rule that placed it (for human review)
"""
import argparse, collections, csv, json, os, re

SYSTEMS = [
    # id, label, colour, one-line summary
    ("skeleton",     "Skeleton",            "#ece4d3", "Bones and cartilage: the body's load-bearing frame."),
    ("joints",       "Joints & ligaments",  "#cdb995", "Ligaments, joint capsules, discs and membranes that bind the skeleton."),
    ("teeth",        "Teeth",               "#f6f2e8", "The permanent dentition: 32 teeth of the upper and lower jaws."),
    ("muscles",      "Muscles",             "#b8453e", "Skeletal muscles, tendons and aponeuroses that move the body."),
    ("heart",        "Heart",               "#a0243a", "Chambers, valves and walls of the heart, with the pericardium."),
    ("arteries",     "Arteries",            "#e0413d", "Systemic and pulmonary arteries carrying blood away from the heart."),
    ("veins",        "Veins",               "#3d63d1", "Systemic and pulmonary veins returning blood to the heart."),
    ("nervous",      "Nervous system",      "#e9c63a", "Brain, spinal cord, cranial and spinal nerves, ganglia and meninges."),
    ("sensory",      "Sensory organs",      "#3fa8a2", "Eyes and ears with their internal structures."),
    ("respiratory",  "Respiratory",         "#ee93a8", "Nose, larynx, trachea, bronchial tree and lungs."),
    ("digestive",    "Digestive",           "#d9884a", "Mouth, pharynx, oesophagus, stomach, intestines, liver, pancreas."),
    ("urinary",      "Urinary",             "#e9b330", "Kidneys, ureters, bladder and urethra."),
    ("reproductive", "Reproductive",        "#b57ac0", "Male reproductive organs and ducts."),
    ("endocrine",    "Endocrine",           "#89b463", "Hormone-producing glands: thyroid, adrenal, pituitary, pineal."),
    ("lymphatic",    "Lymphatic & immune",  "#5fbf74", "Spleen, thymus and lymph nodes."),
    ("skin",         "Skin",                "#e8b89c", "The integument: skin and hair."),
    ("other",        "Other",               "#9a9a9a", "Structures that do not fit another system."),
]

# Generic FMA concepts that carry no anatomical meaning for a reader.
GENERIC = {
    "anatomical entity", "physical anatomical entity", "material anatomical entity", "anatomical structure",
    "organ", "cardinal organ part", "organ region", "organ segment", "organ zone", "organ component",
    "solid organ", "nonparenchymatous organ", "parenchymatous organ", "cavitated organ", "organ with cavitated organ parts",
    "organ with organ cavity", "anatomical set", "anatomical cluster", "immaterial anatomical entity",
    "region of vascular tree organ", "segment of vascular tree organ", "segment of hollow tree organ", "segment of tree organ",
    "subdivision of cardinal body part", "region of organ component", "organ part", "corticomedullary organ", "lobular organ",
    "region of organ", "postnatal anatomical structure", "anatomical space", "organ cavity", "organ cavity subdivision",
    "portion of tissue", "portion of organ part", "hollow tree organ", "tree organ", "vascular tree organ", "neural tree organ",
    "arborial segment of arterial tree organ", "segment of arterial tree organ", "segment of venous tree organ",
    "zone of organ component", "subdivision of organ", "subdivision of cardinal organ part", "region of cardinal organ part",
}

def read_tsv(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        r = csv.reader(f, delimiter="\t")
        header = next(r)
        for row in r:
            if len(row) >= len(header):
                yield row

def read_obj_header(path):
    meta = {}
    with open(path, "rb") as f:
        for line in f:
            if not line.startswith(b"#"):
                break
            s = line.decode("utf-8", "replace").strip()
            m = re.match(r"#\s*([A-Za-z\-\(\) ]+?)\s*:\s*(.*)$", s)
            if m:
                meta[m.group(1).strip()] = m.group(2).strip()
    return meta

def side_of(name, file_id):
    n = name.lower()
    if re.match(r"^(right|left)\b", n):
        return n.split()[0]
    m = re.search(r"\b(right|left)\b", n)
    if m:
        return m.group(1)
    if file_id.endswith("M"):
        return "left"
    return None

def swap_side(name):
    def rep(m):
        w = m.group(0)
        s = {"right": "left", "left": "right", "Right": "Left", "Left": "Right"}[w]
        return s
    return re.sub(r"\b(Right|Left|right|left)\b", rep, name)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bp3d", required=True)
    ap.add_argument("--bp3d30", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "manifest"))
    args = ap.parse_args()
    objdir = os.path.join(args.bp3d, "isa_BP3D_4.0_obj_99")
    datadir = os.path.join(args.bp3d, "data")

    concept_name = {}
    for row in read_tsv(os.path.join(datadir, "isa_parts_list_e.txt")):
        concept_name[row[0]] = row[2]
    elems_of = collections.defaultdict(set)
    concepts_of = collections.defaultdict(set)
    for row in read_tsv(os.path.join(datadir, "isa_element_parts.txt")):
        elems_of[row[0]].add(row[2]); concepts_of[row[2]].add(row[0])

    # 3.0 part-of tree → set of system roots for every concept it contains.
    children = collections.defaultdict(list); name30 = {}
    for row in read_tsv(os.path.join(args.bp3d30, "conventional_part_of.txt")):
        name30[row[0]] = row[1]; name30[row[2]] = row[3]; children[row[0]].append(row[2])
    def subtree(root):
        seen, stack = set(), [root]
        while stack:
            c = stack.pop()
            if c in seen: continue
            seen.add(c); stack.extend(children.get(c, []))
        return seen
    T = {k: subtree(v) for k, v in {
        "heart": "FMA7088", "nervous": "FMA7157", "respiratory": "FMA7158", "alimentary": "FMA7152", "urinary": "FMA7159",
        "sense": "FMA78499", "eye": "FMA54448", "ear": "FMA52780", "integument": "FMA72979", "lymphoid": "FMA74594",
        "endocrine": "FMA9668", "genital": "FMA7160", "skeletal": "FMA23881", "articular": "FMA23878", "muscular": "FMA72954",
        "mouth": "FMA49184", "nose": "FMA46472", "lung": "FMA7195", "perineum": "FMA9579", "skull": "FMA46565",
    }.items()}

    pieces = []
    for fn in sorted(os.listdir(objdir)):
        if not fn.endswith(".obj"): continue
        fid = fn[:-4]
        meta = read_obj_header(os.path.join(objdir, fn))
        cset = concepts_of.get(fid, set())
        concept = meta.get("Concept ID") or ""
        if not concept.startswith("FMA"):
            # Blank header: prefer the mirrored twin's concept, else the most specific concept (fewest elements).
            twin = fid[:-1] if fid.endswith("M") else fid + "M"
            twin_meta = read_obj_header(os.path.join(objdir, twin + ".obj")) if os.path.exists(os.path.join(objdir, twin + ".obj")) else {}
            concept = twin_meta.get("Concept ID") or (min(cset, key=lambda c: (len(elems_of[c]), c)) if cset else "")
            if twin_meta.get("English name") and not meta.get("English name"):
                meta["English name"] = twin_meta["English name"]
        name = meta.get("English name") or concept_name.get(concept, fid)
        name = name[:1].upper() + name[1:]
        pieces.append({"id": fid, "file": fn, "concept": concept, "name": name, "cset": cset,
                       "bounds": meta.get("Bounds(mm)", "")})

    # Names for mirrored copies of unlateralised concepts: "External intercostal muscle" ×2 → add side.
    by_name = collections.defaultdict(list)
    for p in pieces: by_name[p["name"]].append(p)
    for nm, ps in by_name.items():
        if len(ps) == 2 and not re.search(r"\b(right|left)\b", nm, re.I):
            a, b = sorted(ps, key=lambda p: p["id"])
            if b["id"] == a["id"] + "M":
                a["name"], b["name"] = f"{nm} (right)", f"{nm} (left)"

    def has(p, *ids): return any(i in p["cset"] for i in ids)
    def cn(p): return {concept_name.get(c, "").lower() for c in p["cset"]}
    def in30(p, key): return p["concept"] in T[key] or any(c in T[key] for c in p["cset"])
    def nm(p, pattern): return re.search(pattern, p["name"], re.I) is not None

    def classify(p):
        n = cn(p)
        # 1. dentition
        if "tooth" in n or nm(p, r"\btooth\b|\bteeth\b|incisor|canine tooth|premolar|molar tooth"): return "teeth", "tooth"
        # 1b. is-a bone organ (FMA) is unambiguous: bones of the skull, hyoid, sesamoids, etc.
        if has(p, "FMA5018"): return "skeleton", "bone organ"
        # 2. vessels (before heart so coronary vessels stay with vessels)
        if has(p, "FMA50720", "FMA86187", "FMA30313") or "artery" in n or nm(p, r"\barter(y|ies|ial)\b|\baort(a|ic)\b|\barteriole|\bpalmar arch|\bplantar arch|\barterial arch"): return "arteries", "artery"
        if has(p, "FMA50723", "FMA86188") or "vein" in n or nm(p, r"\bveins?\b|\bvenous\b|\bvenae?\b|vena cava|\bvenule|\bsinus\b.*\bdura|\bcavernous sinus|\bsagittal sinus|\bsigmoid sinus|\btransverse sinus|\bpetrosal sinus|\bstraight sinus|\bjugular bulb"): return "veins", "vein"
        # 2b. brain ventricles and lobules must not be caught by the heart rule
        if nm(p, r"\b(lateral|third|fourth) ventricle\b|\bventricle of (brain|cerebrum)|\blobule\b(?!.*(liver|lung|ear))"): return "nervous", "brain"
        # 3. heart proper
        if in30(p, "heart") or nm(p, r"\bheart\b|\batri(um|al)\b|\bventricle\b(?!.*(brain|lateral|third|fourth))|\bmyocardium|\bendocardium|\bepicardium|\bpericardi|\bcardiac\b|\bpapillary muscle|\bchordae|\bmitral|\btricuspid|\baortic valve|\bpulmonary valve|\binterventricular sept|\binteratrial|\bsinoatrial|\batrioventricular|\bcrista terminalis|\bfossa ovalis|\bmoderator band|\btrabeculae carneae|\bcoronary sinus"): return "heart", "heart"
        # 4. nervous system
        if has(p, "FMA65132", "FMA5914", "FMA55675") or in30(p, "nervous") or nm(p, r"\bnerve\b|\bnervus\b|\bganglion|\bplexus\b|\bbrain\b|\bcerebr|\bcerebell|\bspinal cord|\bmedulla oblongata|\bpons\b|\bthalam|\bhypothalam|\bmeninx|\bdura mater|\barachnoid|\bpia mater|\bcortex\b|\bgyrus|\bsulcus|\bnucleus\b|\bwhite matter|\bgray matter|\bgrey matter|\bcorpus callosum|\bfornix|\bhippocamp|\bamygdal|\bputamen|\bcaudate nucleus|\bpallid|\bcapsule\b.*\b(internal|external|extreme)|\bcommissure|\boptic (chiasm|tract|radiation)|\bmidbrain|\bmesencephal|\btectum|\bcolliculus|\bpineal\b(?!.*gland)|\bsubstantia nigra|\bred nucleus|\bolive\b|\bpyramid\b|\bcauda equina|\bfilum terminale|\bconus medullaris|\bsympathetic trunk|\bvagus|\bphrenic\b|\bsciatic|\bfemoral nerve|\bulnar nerve|\bmedian nerve|\bradial nerve|\btibial nerve|\bperoneal|\bfibular nerve|\bobturator nerve|\bpudendal|\bintercostal nerve|\bcranial nerve|\bolfactory|\btrigeminal|\bfacial nerve|\bvestibulocochlear|\bglossopharyngeal|\baccessory nerve|\bhypoglossal|\babducens|\btrochlear|\boculomotor|\bventricle\b.*(brain|lateral|third|fourth)|\bcerebral aqueduct|\bchoroid plexus|\bseptum pellucidum|\bclaustrum|\binsula\b|\bopercul|\blobe\b.*(frontal|parietal|temporal|occipital)|\bfrontal lobe|\bparietal lobe|\btemporal lobe|\boccipital lobe|\bstriatum|\blentiform|\bsubthalam|\bepithalam|\bmammillary|\btuber cinereum|\binfundibulum\b(?!.*(uter|ethmoid))|\bgeniculate|\bpulvinar|\bcuneus|\bprecuneus|\blingual gyrus|\bfusiform|\bparahippocamp|\bcingulate|\buncus\b|\bdentate|\bvermis|\bflocculus|\btonsil of cerebellum|\bcerebellar|\bpeduncle|\bbrachium\b|\btrapezoid body|\bsuperior olive|\bvestibular nucle|\bcochlear nucle|\breticular formation|\bperiaqueductal|\btegmentum|\bcrus cerebri|\bcerebral crus|\bposterior perforated|\banterior perforated|\bhabenul|\bstria\b|\bansa\b|\btrunk of\b.*\bplexus|\broot of\b.*\bnerve|\bramus of\b.*\bnerve|\bbranch of\b.*\bnerve|\bnerve root|\bspinal ganglion|\bdorsal root|\bventral root|\bcervical plexus|\bbrachial plexus|\blumbar plexus|\bsacral plexus|\bcoccygeal plexus|\bsplanchnic|\bciliary ganglion|\bpterygopalatine|\bsubmandibular ganglion|\botic ganglion|\bcarotid body|\bcarotid sinus nerve"): return "nervous", "nerve"
        # 5. muscles (before sensory so extra-ocular muscles are muscles)
        if has(p, "FMA5022") or in30(p, "muscular") or nm(p, r"\bmuscle\b|\bmusculus\b|\btendon\b|\baponeurosis|\bdiaphragm\b|\bsphincter|\blinea alba|\baryepiglottic|\bcricothyroid\b(?!.*(membrane|ligament|artery))|\btendinous ring|\braphe\b|\bgaleal?\b|\bepicranial|\bplatysma|\bretinaculum|\bvinculum|\bfascia\b"): return "muscles", "muscle"
        # 6. sensory
        if in30(p, "eye") or in30(p, "ear") or in30(p, "sense") or nm(p, r"\beye\b|\beyeball|\bocular\b|\blens\b|\bcornea|\bsclera|\bretina|\biris\b|\bchoroid\b(?!.*plexus)|\bciliary body|\bcorona ciliaris|\bciliar(y|is)\b|\bvitreous|\bnasolacrimal|\bconjunctiva|\blacrimal (gland|sac|canaliculus|lake|apparatus|caruncle|papilla|punctum|duct)|\beyelid|\bear\b|\bauricle|\bauricular cartilage|\bpinna|\btympan|\bmalleus|\bincus|\bstapes|\bossicle|\bcochlea|\bvestibul(e|ar)\b|\bsemicircular|\blabyrinth|\bauditory tube|\beustachian|\bpharyngotympanic|\botolith|\bsaccule|\butricle|\bmastoid antrum|\bexternal acoustic meatus|\bcanal of schlemm|\bzonule|\buvea|\btarsal plate|\bmeibomian"): return "sensory", "sense organ"
        # 7. respiratory
        if has(p, "FMA12224", "FMA7195", "FMA7394", "FMA7409", "FMA31739") or in30(p, "lung") or in30(p, "nose") or nm(p, r"\blung\b|\bpulmonary\b(?!.*(artery|vein|trunk))|\bbronch|\btrache|\blaryn|\bcricoid|\barytenoid|\bepiglott|\bcorniculate|\bcuneiform cartilage|\bthyroid cartilage|\bvocal|\bconus elasticus|\bthyrohyoid membrane|\bcricothyroid (membrane|ligament)|\bquadrangular membrane|\bventricular fold|\bvestibular fold|\bnasal\b(?!.*bone)|\bnose\b|\bnostril|\bnaris|\bparanasal|\bmaxillary sinus|\bfrontal sinus|\bsphenoidal sinus|\bethmoidal (sinus|air cell|cells)|\bpleura|\balveol|\bcarina\b|\bglottis|\bpharynx\b(?!.*(muscle|constrictor))|\bnasopharynx|\boropharynx|\blaryngopharynx|\bseptal cartilage|\bcartilage of nose|\balar cartilage"): return "respiratory", "airway"
        # 8. digestive
        if in30(p, "alimentary") or in30(p, "mouth") or nm(p, r"\besophag|\boesophag|\bstomach|\bgastric|\bduoden|\bjejun|\bile(um|al)\b|\bcec(um|al)\b|\bcaec|\bappendix|\bcolon|\brect(um|al)\b|\banal\b|\banus\b|\bliver|\bhepat|\bgall ?bladder|\bbile duct|\bbiliary|\bcystic duct|\bpancrea|\bsalivary|\bparotid|\bsubmandibular gland|\bsublingual|\btongue|\blingual\b|\bgingiva|\bgum\b|\bpalat|\buvula|\btonsil\b(?!.*cerebell)|\bpharyng|\bmouth\b|\boral\b|\blip\b|\blips\b|\bcheek|\bbuccal|\bomentum|\bmesenter|\bmeso(colon|appendix|gastr)|\btaenia|\bileocecal|\bileocaecal|\bperitone|\bintestin|\bgut\b|\bvermiform|\bhaustr|\bpylor|\bcardia\b|\bfundus of stomach|\bsphincter of oddi|\bampulla of vater|\bhepatopancreatic"): return "digestive", "alimentary"
        # 9. urinary
        if in30(p, "urinary") or nm(p, r"\bkidney|\brenal\b(?!.*(artery|vein))|\bureter|\burinary bladder|\bbladder|\burethra|\bnephr|\bcalyx|\bcalyces|\brenal pelvis|\bglomerul"): return "urinary", "urinary"
        # 10. reproductive
        if in30(p, "genital") or in30(p, "perineum") or nm(p, r"\btestis|\btestes|\btesticular|\bepididym|\bductus deferens|\bvas deferens|\bseminal|\bprostat|\bpenis|\bpenile|\bcorpus cavernosum|\bcorpus spongiosum|\bglans|\bscrot|\bspermatic|\bbulbourethral|\bcowper|\bejaculatory|\btunica (albuginea|vaginalis)|\bgubernaculum|\bovar|\buter|\bvagin|\bfallopian|\buterine tube|\bclitor|\blabi(a|um)\b|\bvulva|\bmammary|\bbreast|\bnipple|\bareola"): return "reproductive", "genital"
        # 11. endocrine
        if in30(p, "endocrine") or nm(p, r"\bthyroid gland|\bthyroid\b(?!.*cartilage)|\bparathyroid|\badrenal|\bsuprarenal|\bpituitary|\bhypophys|\bpineal gland|\bpineal body|\bislet|\bendocrine"): return "endocrine", "gland"
        # 12. lymphatic
        if in30(p, "lymphoid") or nm(p, r"\bspleen|\bsplenic\b(?!.*(artery|vein|flexure))|\bthymus|\blymph|\bthoracic duct|\bcisterna chyli|\bimmune"): return "lymphatic", "lymphoid"
        # 13. skin
        if has(p, "FMA7163") or in30(p, "integument") or nm(p, r"\bskin\b|\bhair\b|\bnail\b|\bintegument|\bepiderm|\bdermis|\bsubcutaneous|\bhypoderm"): return "skin", "integument"
        # 14. joints & ligaments (before skeleton so cartilage of joints is here)
        if has(p, "FMA7490", "FMA21496", "FMA30319") or in30(p, "articular") or nm(p, r"\bligament|\bjoint\b|\bcapsule\b|\barticular|\bmeniscus|\bmenisci|\bintervertebral dis[ck]|\bdis[ck] of\b|\blabrum|\binterosseous membrane|\bsynovi|\bbursa|\bsymphysis|\bsyndesmosis|\bsynchondrosis|\bannulus fibrosus|\bnucleus pulposus|\bobturator membrane|\bfibrous ring|\bsacroiliac|\bpubic symphysis|\bcruciate|\bcollateral\b|\bpatellar ligament|\btransverse ligament|\bcoracoacromial|\bcoracoclavicular|\bacromioclavicular ligament|\bsternoclavicular|\bflavum|\bligamenta|\bnuchal|\bsupraspinous|\binterspinous|\biliolumbar|\bsacrotuberous|\bsacrospinous|\binguinal ligament|\bfalx\b|\btentorium"): return "joints", "ligament"
        # 15. skeleton
        if has(p, "FMA5018", "FMA55107", "FMA7474", "FMA7475", "FMA7476", "FMA7477") or in30(p, "skeletal") or in30(p, "skull") or nm(p, r"\bbone\b|\bbones\b|\bvertebra|\bskull|\bcranium|\bcranial\b|\bfemur|\btibia|\bfibula|\bpatella|\bhumerus|\bradius|\bulna|\bscapula|\bclavicle|\bsternum|\brib\b|\bribs\b|\bcostal cartilage|\bpelvis|\bhip bone|\bilium|\bischium|\bpubis|\bsacrum|\bcoccyx|\bmandible|\bmaxilla|\bzygomatic|\btemporal bone|\bparietal bone|\bfrontal bone|\boccipital bone|\bsphenoid|\bethmoid|\blacrimal bone|\bnasal bone|\bpalatine bone|\bcarpal|\bmetacarpal|\bphalan|\btarsal|\bmetatarsal|\bcalcaneus|\btalus|\bnavicular|\bcuboid|\bcuneiform|\bscaphoid|\blunate|\btriquetr|\bpisiform|\btrapezium|\btrapezoid|\bcapitate|\bhamate|\bsesamoid|\batlas\b|\baxis\b|\bcartilage|\bosseous|\bskeleton|\bperiosteum|\bepiphysis|\bdiaphysis|\bmetaphysis|\bcondyle|\bprocess of\b|\btrochanter|\btuberosity|\bepicondyle|\bmalleolus|\bacetabulum|\bglenoid|\bcoracoid|\bacromion|\bolecranon|\bstyloid|\bmastoid process|\bxiphoid|\bmanubrium|\bodontoid|\bdens\b"): return "skeleton", "bone"
        return "other", "unmatched"

    sys_ids = [s[0] for s in SYSTEMS]
    for p in pieces:
        p["system"], p["rule"] = classify(p)
        p["side"] = side_of(p["name"], p["id"])

    # bilateral pairs
    by_name = {p["name"]: p for p in pieces}
    by_id = {p["id"]: p for p in pieces}
    for p in pieces:
        pair = None
        if p["id"].endswith("M") and p["id"][:-1] in by_id: pair = p["id"][:-1]
        elif (p["id"] + "M") in by_id: pair = p["id"] + "M"
        else:
            sw = swap_side(p["name"])
            if sw != p["name"] and sw in by_name: pair = by_name[sw]["id"]
        if pair: p["pair"] = pair

    # readable hierarchy: informative ancestor concepts, most general first
    def hierarchy(p):
        cs = [c for c in p["cset"] if concept_name.get(c, "").lower() not in GENERIC and c != p["concept"]]
        cs.sort(key=lambda c: -len(elems_of[c]))
        return [c for c in cs if len(elems_of[c]) < 2000]

    # concept index: every concept with at least one element, excluding generic ones
    concept_index = {}
    for c, es in elems_of.items():
        label = concept_name.get(c, "")
        if not label or label.lower() in GENERIC: continue
        concept_index[c] = label
    cids = sorted(concept_index, key=lambda c: concept_index[c].lower())
    cpos = {c: i for i, c in enumerate(cids)}

    out_pieces = []
    for p in pieces:
        d = {"id": p["id"], "file": p["file"], "name": p["name"], "system": p["system"], "concept": p["concept"]}
        if p.get("side"): d["side"] = p["side"]
        if p.get("pair"): d["pair"] = p["pair"]
        h = [cpos[c] for c in hierarchy(p) if c in cpos]
        if h: d["parents"] = h
        out_pieces.append(d)
    order = {s: i for i, s in enumerate(sys_ids)}
    out_pieces.sort(key=lambda d: (order[d["system"]], d["name"].lower(), d["id"]))

    # structures: one entity per (concept, name); a structure may own several mesh pieces
    struct_index = {}
    structures = []
    for i, d in enumerate(out_pieces):
        key = (d["concept"], d["name"])
        if key not in struct_index:
            struct_index[key] = len(structures)
            s = {"id": d["id"], "name": d["name"], "concept": d["concept"], "system": d["system"], "pieces": []}  # id = first piece's file id (stable across rebuilds)
            if d.get("side"): s["side"] = d["side"]
            if d.get("parents"): s["parents"] = d["parents"]
            structures.append(s)
        si = struct_index[key]
        structures[si]["pieces"].append(i)
        d["structure"] = si
    piece_struct = {d["id"]: d["structure"] for d in out_pieces}
    for s in structures:
        first = out_pieces[s["pieces"][0]]
        if first.get("pair") and piece_struct.get(first["pair"]) is not None and piece_struct[first["pair"]] != structures.index(s):
            s["pair"] = piece_struct[first["pair"]]
    multi = [s for s in structures if len(s["pieces"]) > 1]
    print("structures:", len(structures), "with multiple pieces:", len(multi))
    counts = collections.Counter(d["system"] for d in out_pieces)
    manifest = {
        "source": {
            "name": "BodyParts3D 4.0 (is-a tree release, obj_99)",
            "attribution": "BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution 4.0 International",
            "url": "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/",
            "doi": "10.18908/lsdba.nbdc00837-000",
            "paper": "Mitsuhashi N, et al. BodyParts3D: 3D structure database for anatomical concepts. Nucleic Acids Res. 2009;37:D782-5.",
        },
        "systems": [{"id": s[0], "name": s[1], "color": s[2], "summary": s[3], "count": counts.get(s[0], 0)} for s in SYSTEMS if counts.get(s[0], 0) > 0],
        "concepts": [{"id": c, "name": concept_index[c]} for c in cids],
        "structures": structures,
        "pieces": out_pieces,
    }
    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "atlas-source.json"), "w") as f:
        json.dump(manifest, f, separators=(",", ":"))

    with open(os.path.join(args.out, "review.txt"), "w") as f:
        for s in SYSTEMS:
            ps = [p for p in pieces if p["system"] == s[0]]
            if not ps: continue
            f.write(f"\n### {s[1]} ({len(ps)})\n")
            for p in sorted(ps, key=lambda p: p["name"].lower()):
                f.write(f"{p['id']:8s} {p['concept']:10s} {p['rule']:10s} {p['name']}\n")
    print("pieces:", len(out_pieces), "concepts:", len(cids))
    for s in SYSTEMS:
        if counts.get(s[0]): print(f"  {s[1]:22s} {counts[s[0]]}")

if __name__ == "__main__":
    main()
