#!/usr/bin/env python3
"""Maintainer fix-ups applied after author batches are merged (idempotent: safe to re-run after every merge or update).

usage: python3 tools/verification/post_merge_fixups.py

What it does, in order:
  1. references: URLs the "Reference links" workflow reported as redirecting (NHS sub-pages merged into one page, rebrands, the PubMed
     Central host) are replaced by their final address in content/*.json and content/blog/*.json; references that then repeat a
     URL are merged into one entry whose "section" lists the original sub-pages; URLs known to be wrong are corrected or dropped.
  2. prose: a short list of exact phrases that a human reviewer asked to remove (tablet strengths, dosing schedules, second-person
     instructions) is rewritten.
  3. links: relationship groups a page needs to pass the publishing gate and that the sources support (chlamydia: test, medicine).
  4. categories: conditions an author batch left in the catch-all category "other" move to mental health, skin and allergy, or infections.

Add a line to the tables below whenever a review or a CI run finds another case, then re-run; a batch that is merged again with
--update-batches is repaired by this script the same way.
"""
import glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import check_batch as cb  # noqa: E402

# ---- 1. references ----------------------------------------------------------------------------------------------------------------
REDIRECTS = """
https://britishlivertrust.org.uk/information-and-support/liver-conditions/hepatitis-c/ https://liveruk.org/about-liver-disease/conditions/hepatitis-c/
https://britishlivertrust.org.uk/information-and-support/liver-conditions/masld-nafld-and-fatty-liver-disease/ https://liveruk.org/about-liver-disease/conditions/masld/
https://versusarthritis.org/about-arthritis/conditions/back-pain/ https://www.arthritis-uk.org/information-and-support/understanding-arthritis/conditions/back-pain/
https://versusarthritis.org/about-arthritis/conditions/fibromyalgia/ https://www.arthritis-uk.org/information-and-support/understanding-arthritis/conditions/fibromyalgia/
https://www.bhf.org.uk/informationsupport/treatments/statins https://www.bhf.org.uk/informationsupport/treatments/medicine/statins
https://www.cancer.gov/types/adrenocortical/patient/adrenocortical-treatment-pdq https://www.cancer.gov/types/adrenocortical/treatment
https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11465611/ https://pmc.ncbi.nlm.nih.gov/articles/PMC11465611/
https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3196003/ https://pmc.ncbi.nlm.nih.gov/articles/PMC3196003/
https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7164699/ https://pmc.ncbi.nlm.nih.gov/articles/PMC7164699/
https://www.nhs.uk/conditions/abdominal-aortic-aneurysm/treatment/ https://www.nhs.uk/conditions/abdominal-aortic-aneurysm/
https://www.nhs.uk/conditions/addisons-disease/causes/ https://www.nhs.uk/conditions/addisons-disease/
https://www.nhs.uk/conditions/addisons-disease/diagnosis/ https://www.nhs.uk/conditions/addisons-disease/
https://www.nhs.uk/conditions/addisons-disease/symptoms/ https://www.nhs.uk/conditions/addisons-disease/
https://www.nhs.uk/conditions/angina/diagnosis/ https://www.nhs.uk/conditions/angina/
https://www.nhs.uk/conditions/angina/treatment/ https://www.nhs.uk/conditions/angina/
https://www.nhs.uk/conditions/antihistamines/ https://www.nhs.uk/medicines/antihistamines/
https://www.nhs.uk/conditions/cystitis/ https://www.nhs.uk/conditions/urinary-tract-infections-utis/
https://www.nhs.uk/conditions/heart-attack/symptoms/ https://www.nhs.uk/conditions/heart-attack/
https://www.nhs.uk/conditions/hepatitis-c/diagnosis/ https://www.nhs.uk/conditions/hepatitis-c/
https://www.nhs.uk/conditions/hepatitis-c/treatment/ https://www.nhs.uk/conditions/hepatitis-c/
https://www.nhs.uk/conditions/hip-fracture/ https://www.nhs.uk/conditions/broken-hip/
https://www.nhs.uk/conditions/kidney-stones/symptoms/ https://www.nhs.uk/conditions/kidney-stones/
https://www.nhs.uk/conditions/multiple-sclerosis/diagnosis/ https://www.nhs.uk/conditions/multiple-sclerosis/
https://www.nhs.uk/conditions/peripheral-arterial-disease-pad/treatment/ https://www.nhs.uk/conditions/peripheral-arterial-disease-pad/
https://www.nhs.uk/live-well/healthy-weight/bmi-calculator/ https://www.nhs.uk/health-assessment-tools/calculate-your-body-mass-index/
https://www.nhs.uk/medicines/apixaban/side-effects-of-apixaban/ https://www.nhs.uk/medicines/apixaban/
https://www.nhs.uk/medicines/apixaban/taking-apixaban-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/apixaban/
https://www.nhs.uk/medicines/atorvastatin/about-atorvastatin/ https://www.nhs.uk/medicines/atorvastatin/
https://www.nhs.uk/medicines/atorvastatin/common-questions-about-atorvastatin/ https://www.nhs.uk/medicines/atorvastatin/
https://www.nhs.uk/medicines/citalopram/common-questions-about-citalopram/ https://www.nhs.uk/medicines/citalopram/
https://www.nhs.uk/medicines/codeine/common-questions-about-codeine/ https://www.nhs.uk/medicines/codeine/
https://www.nhs.uk/medicines/codeine/pregnancy-breastfeeding-and-fertility-while-taking-codeine/ https://www.nhs.uk/medicines/codeine/
https://www.nhs.uk/medicines/codeine/side-effects-of-codeine/ https://www.nhs.uk/medicines/codeine/
https://www.nhs.uk/medicines/codeine/who-can-and-cannot-take-codeine/ https://www.nhs.uk/medicines/codeine/
https://www.nhs.uk/medicines/ibuprofen-for-adults/side-effects-of-ibuprofen/ https://www.nhs.uk/medicines/ibuprofen-for-adults/
https://www.nhs.uk/medicines/ibuprofen-for-adults/taking-ibuprofen-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/ibuprofen-for-adults/
https://www.nhs.uk/medicines/ibuprofen-for-adults/who-can-and-cannot-take-ibuprofen/ https://www.nhs.uk/medicines/ibuprofen-for-adults/
https://www.nhs.uk/medicines/ibuprofen-for-children/taking-ibuprofen-for-children-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/ibuprofen-for-children/
https://www.nhs.uk/medicines/metformin/common-questions-about-metformin/ https://www.nhs.uk/medicines/metformin/
https://www.nhs.uk/medicines/metformin/how-and-when-to-take-metformin/ https://www.nhs.uk/medicines/metformin/
https://www.nhs.uk/medicines/metformin/side-effects-of-metformin/ https://www.nhs.uk/medicines/metformin/
https://www.nhs.uk/medicines/metformin/who-can-and-cannot-take-metformin/ https://www.nhs.uk/medicines/metformin/
https://www.nhs.uk/medicines/naproxen/about-naproxen/ https://www.nhs.uk/medicines/naproxen/
https://www.nhs.uk/medicines/naproxen/common-questions-about-naproxen/ https://www.nhs.uk/medicines/naproxen/
https://www.nhs.uk/medicines/naproxen/pregnancy-breastfeeding-and-fertility-while-taking-naproxen/ https://www.nhs.uk/medicines/naproxen/
https://www.nhs.uk/medicines/naproxen/side-effects-of-naproxen/ https://www.nhs.uk/medicines/naproxen/
https://www.nhs.uk/medicines/naproxen/who-can-and-cannot-take-naproxen/ https://www.nhs.uk/medicines/naproxen/
https://www.nhs.uk/medicines/paracetamol-for-adults/taking-paracetamol-for-adults-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/paracetamol-for-adults/
https://www.nhs.uk/medicines/rosuvastatin/side-effects-of-rosuvastatin/ https://www.nhs.uk/medicines/rosuvastatin/
https://www.nhs.uk/medicines/sertraline/about-sertraline/ https://www.nhs.uk/medicines/sertraline/
https://www.nhs.uk/medicines/sertraline/how-and-when-to-take-sertraline/ https://www.nhs.uk/medicines/sertraline/
https://www.nhs.uk/medicines/sertraline/side-effects-of-sertraline/ https://www.nhs.uk/medicines/sertraline/
https://www.nhs.uk/medicines/simvastatin/about-simvastatin/ https://www.nhs.uk/medicines/simvastatin/
https://www.nhs.uk/medicines/simvastatin/common-questions-about-simvastatin/ https://www.nhs.uk/medicines/simvastatin/
https://www.nhs.uk/medicines/simvastatin/pregnancy-breastfeeding-and-fertility-while-taking-simvastatin/ https://www.nhs.uk/medicines/simvastatin/
https://www.nhs.uk/medicines/simvastatin/side-effects-of-simvastatin/ https://www.nhs.uk/medicines/simvastatin/
https://www.nhs.uk/medicines/simvastatin/taking-simvastatin-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/simvastatin/
https://www.nhs.uk/medicines/simvastatin/who-can-and-cannot-take-simvastatin/ https://www.nhs.uk/medicines/simvastatin/
https://www.who.int/news/item/27-07-2026--who--integration--innovation-and-community-leadership-key-to-ending-hiv--hepatitis-and-stis https://www.who.int/news/item/27-07-2026-who--integration--innovation-and-community-leadership-key-to-ending-hiv--hepatitis-and-stis
https://eczema.org/information-and-advice/living-with-eczema/skin-infections-and-eczema/ https://www.eczema.org.uk/support/living-with-eczema
https://eczema.org/information-and-advice/treatments-for-eczema/phototherapy/ https://www.eczema.org.uk/support/phototherapy
https://eczema.org/information-and-advice/types-of-eczema/atopic-eczema/ https://www.eczema.org.uk/support/atopic-eczema
https://myhealth-devon.nhs.uk/my-condition/abnormal-liver-blood-tests https://myhealth-devon.nhs.uk/my-condition/condition/abnormal-liver-blood-tests/
https://rnid.org.uk/information-and-support/hearing-loss/types-of-hearing-loss-and-deafness/sudden-hearing-loss/ https://rnid.org.uk/information-and-support/hearing-loss/types-and-causes/sudden-hearing-loss/
https://versusarthritis.org/about-arthritis/treatments/drugs/methotrexate/ https://www.arthritis-uk.org/information-and-support/understanding-arthritis/arthritis-treatments/drugs/methotrexate/
https://www.allergyuk.org/about-allergy/types-of-allergies/hayfever/ https://www.allergyuk.org/types-of-allergies/hayfever/
https://www.cancer.gov/types/pancreatic/patient/pancreatic-treatment-pdq https://www.cancer.gov/types/pancreatic/treatment
https://www.gov.uk/government/publications/health-protection-in-schools-and-other-childcare-facilities/managing-specific-infectious-diseases-a-to-z https://www.gov.uk/government/publications/health-protection-in-schools-and-other-childcare-facilities
https://www.gov.uk/government/statistics/sexually-transmitted-infections-stis-annual-data-tables/sexually-transmitted-infections-and-screening-for-chlamydia-in-england-2024-report https://www.gov.uk/government/statistics/sexually-transmitted-infections-stis-annual-data-tables
https://www.miscarriageassociation.org.uk/how-we-help/our-support-services/ https://www.miscarriageuk.org/our-support-services/
https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10628572/ https://pmc.ncbi.nlm.nih.gov/articles/PMC10628572/
https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11773994/ https://pmc.ncbi.nlm.nih.gov/articles/PMC11773994/
https://www.nhs.uk/conditions/acne/causes/ https://www.nhs.uk/conditions/acne/
https://www.nhs.uk/conditions/acne/treatment/ https://www.nhs.uk/conditions/acne/
https://www.nhs.uk/conditions/autism/getting-diagnosed/assessments/ https://www.nhs.uk/conditions/autism/assessments/
https://www.nhs.uk/conditions/benign-brain-tumour/treatment/ https://www.nhs.uk/conditions/non-cancerous-benign-brain-tumours/
https://www.nhs.uk/conditions/blood-tests/types/ https://www.nhs.uk/tests-and-treatments/blood-tests/
https://www.nhs.uk/conditions/chlamydia/complications/ https://www.nhs.uk/conditions/chlamydia/
https://www.nhs.uk/conditions/chlamydia/diagnosis/ https://www.nhs.uk/conditions/chlamydia/
https://www.nhs.uk/conditions/chlamydia/symptoms/ https://www.nhs.uk/conditions/chlamydia/
https://www.nhs.uk/conditions/chlamydia/treatment/ https://www.nhs.uk/conditions/chlamydia/
https://www.nhs.uk/conditions/contraception/combined-contraceptive-pill/ https://www.nhs.uk/contraception/methods-of-contraception/combined-pill/
https://www.nhs.uk/conditions/contraception/contraceptive-patch/ https://www.nhs.uk/contraception/methods-of-contraception/contraceptive-patch/
https://www.nhs.uk/conditions/contraception/contraceptive-pill-interact-medicines/ https://www.nhs.uk/contraception/methods-of-contraception/
https://www.nhs.uk/conditions/falls/prevention/ https://www.nhs.uk/conditions/falls/
https://www.nhs.uk/conditions/gonorrhoea/complications/ https://www.nhs.uk/conditions/gonorrhoea/
https://www.nhs.uk/conditions/gonorrhoea/treatment/ https://www.nhs.uk/conditions/gonorrhoea/
https://www.nhs.uk/conditions/heart-attack/diagnosis/ https://www.nhs.uk/conditions/heart-attack/
https://www.nhs.uk/conditions/heart-failure/symptoms/ https://www.nhs.uk/conditions/heart-failure/
https://www.nhs.uk/conditions/high-blood-pressure-hypertension/treatment/ https://www.nhs.uk/conditions/high-blood-pressure/
https://www.nhs.uk/conditions/hiv-and-aids/diagnosis/ https://www.nhs.uk/conditions/hiv-and-aids/
https://www.nhs.uk/conditions/hiv-and-aids/treatment/ https://www.nhs.uk/conditions/hiv-and-aids/
https://www.nhs.uk/conditions/kidney-infection/symptoms/ https://www.nhs.uk/conditions/kidney-infection/
https://www.nhs.uk/conditions/kidney-infection/treatment/ https://www.nhs.uk/conditions/kidney-infection/
https://www.nhs.uk/conditions/kidney-stones/treatment/ https://www.nhs.uk/conditions/kidney-stones/
https://www.nhs.uk/conditions/meningitis/symptoms/ https://www.nhs.uk/conditions/meningitis/
https://www.nhs.uk/conditions/meningitis/treatment/ https://www.nhs.uk/conditions/meningitis/
https://www.nhs.uk/conditions/meningitis/vaccination/ https://www.nhs.uk/conditions/meningitis/
https://www.nhs.uk/conditions/menopause/treatment/ https://www.nhs.uk/conditions/menopause-and-perimenopause/treatment/
https://www.nhs.uk/conditions/migraine/treatment/ https://www.nhs.uk/conditions/migraine/
https://www.nhs.uk/conditions/miscarriage/causes/ https://www.nhs.uk/conditions/miscarriage/
https://www.nhs.uk/conditions/miscarriage/symptoms/ https://www.nhs.uk/conditions/miscarriage/
https://www.nhs.uk/conditions/pre-eclampsia/diagnosis/ https://www.nhs.uk/conditions/pre-eclampsia/
https://www.nhs.uk/conditions/pre-eclampsia/treatment/ https://www.nhs.uk/conditions/pre-eclampsia/
https://www.nhs.uk/conditions/prostate-enlargement/diagnosis/ https://www.nhs.uk/conditions/enlarged-prostate/
https://www.nhs.uk/conditions/prostate-enlargement/symptoms/ https://www.nhs.uk/conditions/enlarged-prostate/
https://www.nhs.uk/conditions/prostate-enlargement/treatment/ https://www.nhs.uk/conditions/enlarged-prostate/
https://www.nhs.uk/conditions/psoriasis/causes/ https://www.nhs.uk/conditions/psoriasis/
https://www.nhs.uk/conditions/sepsis/who-can-get-it/ https://www.nhs.uk/conditions/sepsis/
https://www.nhs.uk/conditions/steroid-inhalers/ https://www.nhs.uk/medicines/steroids/
https://www.nhs.uk/conditions/trichomoniasis/treatment/ https://www.nhs.uk/conditions/trichomoniasis/
https://www.nhs.uk/conditions/underactive-thyroid-hypothyroidism/diagnosis/ https://www.nhs.uk/conditions/underactive-thyroid-hypothyroidism/
https://www.nhs.uk/conditions/underactive-thyroid-hypothyroidism/treatment/ https://www.nhs.uk/conditions/underactive-thyroid-hypothyroidism/
https://www.nhs.uk/medicines/aciclovir/about-aciclovir/ https://www.nhs.uk/medicines/aciclovir/
https://www.nhs.uk/medicines/aciclovir/common-questions-about-aciclovir/ https://www.nhs.uk/medicines/aciclovir/
https://www.nhs.uk/medicines/aciclovir/side-effects-of-aciclovir/ https://www.nhs.uk/medicines/aciclovir/
https://www.nhs.uk/medicines/aciclovir/taking-or-using-aciclovir-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/aciclovir/
https://www.nhs.uk/medicines/aciclovir/who-can-and-cannot-take-or-use-aciclovir/ https://www.nhs.uk/medicines/aciclovir/
https://www.nhs.uk/medicines/amlodipine/side-effects-of-amlodipine/ https://www.nhs.uk/medicines/amlodipine/
https://www.nhs.uk/medicines/dapagliflozin/about-dapagliflozin/ https://www.nhs.uk/medicines/dapagliflozin/
https://www.nhs.uk/medicines/dapagliflozin/common-questions-about-dapagliflozin/ https://www.nhs.uk/medicines/dapagliflozin/
https://www.nhs.uk/medicines/dapagliflozin/side-effects-of-dapagliflozin/ https://www.nhs.uk/medicines/dapagliflozin/
https://www.nhs.uk/medicines/dapagliflozin/who-can-and-cannot-take-dapagliflozin/ https://www.nhs.uk/medicines/dapagliflozin/
https://www.nhs.uk/medicines/doxycycline/common-questions-about-doxycycline/ https://www.nhs.uk/medicines/doxycycline/
https://www.nhs.uk/medicines/doxycycline/pregnancy-breastfeeding-and-fertility-while-taking-doxycycline/ https://www.nhs.uk/medicines/doxycycline/
https://www.nhs.uk/medicines/doxycycline/side-effects-of-doxycycline/ https://www.nhs.uk/medicines/doxycycline/
https://www.nhs.uk/medicines/doxycycline/taking-doxycycline-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/doxycycline/
https://www.nhs.uk/medicines/duloxetine/about-duloxetine/ https://www.nhs.uk/medicines/duloxetine/
https://www.nhs.uk/medicines/duloxetine/common-questions-about-duloxetine/ https://www.nhs.uk/medicines/duloxetine/
https://www.nhs.uk/medicines/duloxetine/pregnancy-breastfeeding-and-fertility-while-taking-duloxetine/ https://www.nhs.uk/medicines/duloxetine/
https://www.nhs.uk/medicines/duloxetine/side-effects-of-duloxetine/ https://www.nhs.uk/medicines/duloxetine/
https://www.nhs.uk/medicines/duloxetine/taking-duloxetine-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/duloxetine/
https://www.nhs.uk/medicines/duloxetine/who-can-and-cannot-take-duloxetine/ https://www.nhs.uk/medicines/duloxetine/
https://www.nhs.uk/medicines/empagliflozin/about-empagliflozin/ https://www.nhs.uk/medicines/empagliflozin/
https://www.nhs.uk/medicines/empagliflozin/common-questions-about-empagliflozin/ https://www.nhs.uk/medicines/empagliflozin/
https://www.nhs.uk/medicines/empagliflozin/pregnancy-breastfeeding-and-fertility-while-taking-empagliflozin/ https://www.nhs.uk/medicines/empagliflozin/
https://www.nhs.uk/medicines/empagliflozin/side-effects-of-empagliflozin/ https://www.nhs.uk/medicines/empagliflozin/
https://www.nhs.uk/medicines/empagliflozin/who-can-and-cannot-take-empagliflozin/ https://www.nhs.uk/medicines/empagliflozin/
https://www.nhs.uk/medicines/fluconazole/about-fluconazole/ https://www.nhs.uk/medicines/fluconazole/
https://www.nhs.uk/medicines/fluconazole/common-questions-about-fluconazole/ https://www.nhs.uk/medicines/fluconazole/
https://www.nhs.uk/medicines/fluconazole/pregnancy-breastfeeding-and-fertility-while-taking-fluconazole/ https://www.nhs.uk/medicines/fluconazole/
https://www.nhs.uk/medicines/fluconazole/side-effects-of-fluconazole/ https://www.nhs.uk/medicines/fluconazole/
https://www.nhs.uk/medicines/fluconazole/taking-fluconazole-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/fluconazole/
https://www.nhs.uk/medicines/fluconazole/who-can-and-cannot-take-fluconazole/ https://www.nhs.uk/medicines/fluconazole/
https://www.nhs.uk/medicines/fluoxetine-prozac/common-questions-about-fluoxetine/ https://www.nhs.uk/medicines/fluoxetine/
https://www.nhs.uk/medicines/fluoxetine-prozac/pregnancy-breastfeeding-and-fertility-while-taking-fluoxetine/ https://www.nhs.uk/medicines/fluoxetine/
https://www.nhs.uk/medicines/fluoxetine-prozac/side-effects-of-fluoxetine/ https://www.nhs.uk/medicines/fluoxetine/
https://www.nhs.uk/medicines/fluoxetine-prozac/taking-fluoxetine-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/fluoxetine/
https://www.nhs.uk/medicines/fluoxetine-prozac/who-can-and-cannot-take-fluoxetine/ https://www.nhs.uk/medicines/fluoxetine/
https://www.nhs.uk/medicines/gliclazide/about-gliclazide/ https://www.nhs.uk/medicines/gliclazide/
https://www.nhs.uk/medicines/gliclazide/common-questions-about-gliclazide/ https://www.nhs.uk/medicines/gliclazide/
https://www.nhs.uk/medicines/gliclazide/side-effects-of-gliclazide/ https://www.nhs.uk/medicines/gliclazide/
https://www.nhs.uk/medicines/gliclazide/taking-gliclazide-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/gliclazide/
https://www.nhs.uk/medicines/hydroxychloroquine/common-questions-about-hydroxychloroquine/ https://www.nhs.uk/medicines/hydroxychloroquine/
https://www.nhs.uk/medicines/hydroxychloroquine/pregnancy-breastfeeding-and-fertility-while-taking-hydroxychloroquine/ https://www.nhs.uk/medicines/hydroxychloroquine/
https://www.nhs.uk/medicines/hydroxychloroquine/side-effects-of-hydroxychloroquine/ https://www.nhs.uk/medicines/hydroxychloroquine/
https://www.nhs.uk/medicines/hydroxychloroquine/taking-hydroxychloroquine-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/hydroxychloroquine/
https://www.nhs.uk/medicines/hydroxychloroquine/who-can-and-cannot-take-hydroxychloroquine/ https://www.nhs.uk/medicines/hydroxychloroquine/
https://www.nhs.uk/medicines/lactulose/about-lactulose/ https://www.nhs.uk/medicines/lactulose/
https://www.nhs.uk/medicines/lactulose/common-questions-about-lactulose/ https://www.nhs.uk/medicines/lactulose/
https://www.nhs.uk/medicines/lactulose/pregnancy-breastfeeding-and-fertility-while-taking-lactulose/ https://www.nhs.uk/medicines/lactulose/
https://www.nhs.uk/medicines/lactulose/side-effects-of-lactulose/ https://www.nhs.uk/medicines/lactulose/
https://www.nhs.uk/medicines/lactulose/who-can-and-cannot-take-lactulose/ https://www.nhs.uk/medicines/lactulose/
https://www.nhs.uk/medicines/losartan/pregnancy-breastfeeding-and-fertility-while-taking-losartan/ https://www.nhs.uk/medicines/losartan/
https://www.nhs.uk/medicines/metoclopramide/side-effects-of-metoclopramide/ https://www.nhs.uk/medicines/metoclopramide/
https://www.nhs.uk/medicines/metoclopramide/taking-metoclopramide-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/metoclopramide/
https://www.nhs.uk/medicines/metoclopramide/who-can-and-cannot-take-metoclopramide/ https://www.nhs.uk/medicines/metoclopramide/
https://www.nhs.uk/medicines/mirtazapine/about-mirtazapine/ https://www.nhs.uk/medicines/mirtazapine/
https://www.nhs.uk/medicines/mirtazapine/common-questions-about-mirtazapine/ https://www.nhs.uk/medicines/mirtazapine/
https://www.nhs.uk/medicines/mirtazapine/pregnancy-breastfeeding-and-fertility-while-taking-mirtazapine/ https://www.nhs.uk/medicines/mirtazapine/
https://www.nhs.uk/medicines/mirtazapine/side-effects-of-mirtazapine/ https://www.nhs.uk/medicines/mirtazapine/
https://www.nhs.uk/medicines/mirtazapine/taking-mirtazapine-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/mirtazapine/
https://www.nhs.uk/medicines/mirtazapine/who-can-and-cannot-take-mirtazapine/ https://www.nhs.uk/medicines/mirtazapine/
https://www.nhs.uk/medicines/nitrofurantoin/about-nitrofurantoin/ https://www.nhs.uk/medicines/nitrofurantoin/
https://www.nhs.uk/medicines/nitrofurantoin/how-and-when-to-take-nitrofurantoin/ https://www.nhs.uk/medicines/nitrofurantoin/
https://www.nhs.uk/medicines/nitrofurantoin/pregnancy-breastfeeding-and-fertility-while-taking-nitrofurantoin/ https://www.nhs.uk/medicines/nitrofurantoin/
https://www.nhs.uk/medicines/nitrofurantoin/side-effects-of-nitrofurantoin/ https://www.nhs.uk/medicines/nitrofurantoin/
https://www.nhs.uk/medicines/nitrofurantoin/who-can-and-cannot-take-nitrofurantoin/ https://www.nhs.uk/medicines/nitrofurantoin/
https://www.nhs.uk/medicines/sildenafil-viagra/about-sildenafil-viagra/ https://www.nhs.uk/medicines/sildenafil-viagra/
https://www.nhs.uk/medicines/sildenafil-viagra/common-questions-about-sildenafil/ https://www.nhs.uk/medicines/sildenafil-viagra/
https://www.nhs.uk/medicines/sildenafil-viagra/how-and-where-to-get-sildenafil/ https://www.nhs.uk/medicines/sildenafil-viagra/
https://www.nhs.uk/medicines/sildenafil-viagra/side-effects-of-sildenafil/ https://www.nhs.uk/medicines/sildenafil-viagra/
https://www.nhs.uk/medicines/sildenafil-viagra/taking-sildenafil-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/sildenafil-viagra/
https://www.nhs.uk/medicines/sildenafil-viagra/who-can-and-cannot-take-sildenafil/ https://www.nhs.uk/medicines/sildenafil-viagra/
https://www.nhs.uk/medicines/sumatriptan/pregnancy-breastfeeding-and-fertility-while-taking-sumatriptan/ https://www.nhs.uk/medicines/sumatriptan/
https://www.nhs.uk/medicines/sumatriptan/side-effects-of-sumatriptan/ https://www.nhs.uk/medicines/sumatriptan/
https://www.nhs.uk/medicines/sumatriptan/taking-sumatriptan-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/sumatriptan/
https://www.nhs.uk/medicines/sumatriptan/who-can-and-cannot-take-or-use-sumatriptan/ https://www.nhs.uk/medicines/sumatriptan/
https://www.nhs.uk/medicines/tamsulosin/common-questions-about-tamsulosin/ https://www.nhs.uk/medicines/tamsulosin/
https://www.nhs.uk/medicines/tamsulosin/pregnancy-breastfeeding-and-fertility-while-taking-tamsulosin/ https://www.nhs.uk/medicines/tamsulosin/
https://www.nhs.uk/medicines/tamsulosin/side-effects-of-tamsulosin/ https://www.nhs.uk/medicines/tamsulosin/
https://www.nhs.uk/medicines/tamsulosin/taking-tamsulosin-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/tamsulosin/
https://www.nhs.uk/medicines/tamsulosin/who-can-and-cannot-take-tamsulosin/ https://www.nhs.uk/medicines/tamsulosin/
https://www.nhs.uk/medicines/venlafaxine/how-and-when-to-take-venlafaxine/ https://www.nhs.uk/medicines/venlafaxine/
https://www.nhs.uk/medicines/venlafaxine/pregnancy-breastfeeding-and-fertility-while-taking-venlafaxine/ https://www.nhs.uk/medicines/venlafaxine/
https://www.nhs.uk/medicines/venlafaxine/side-effects-of-venlafaxine/ https://www.nhs.uk/medicines/venlafaxine/
https://www.nhs.uk/medicines/venlafaxine/taking-venlafaxine-with-other-medicines-and-herbal-supplements/ https://www.nhs.uk/medicines/venlafaxine/
https://www.nhs.uk/medicines/venlafaxine/who-can-and-cannot-take-venlafaxine/ https://www.nhs.uk/medicines/venlafaxine/
https://www.nhs.uk/medicines/zopiclone/common-questions-about-zopiclone/ https://www.nhs.uk/medicines/zopiclone/
https://www.nhs.uk/medicines/zopiclone/pregnancy-breastfeeding-and-fertility-while-taking-zopiclone/ https://www.nhs.uk/medicines/zopiclone/
https://www.nhs.uk/medicines/zopiclone/side-effects-of-zopiclone/ https://www.nhs.uk/medicines/zopiclone/
https://www.nhs.uk/medicines/zopiclone/who-can-and-cannot-take-zopiclone/ https://www.nhs.uk/medicines/zopiclone/
https://www.nhs.uk/mental-health/conditions/bipolar-disorder/treatment/ https://www.nhs.uk/mental-health/conditions/bipolar-disorder/
https://www.nhs.uk/mental-health/conditions/generalised-anxiety-disorder/diagnosis/ https://www.nhs.uk/mental-health/conditions/generalised-anxiety-disorder-gad/
https://www.nhs.uk/mental-health/conditions/generalised-anxiety-disorder/overview/ https://www.nhs.uk/mental-health/conditions/generalised-anxiety-disorder-gad/
https://www.nhs.uk/mental-health/conditions/generalised-anxiety-disorder/self-help/ https://www.nhs.uk/mental-health/conditions/generalised-anxiety-disorder-gad/
https://www.nhs.uk/mental-health/conditions/generalised-anxiety-disorder/treatment/ https://www.nhs.uk/mental-health/conditions/generalised-anxiety-disorder-gad/
https://www.nhs.uk/mental-health/conditions/post-traumatic-stress-disorder-ptsd/causes/ https://www.nhs.uk/mental-health/conditions/ptsd-post-traumatic-stress-disorder/
https://www.nhs.uk/mental-health/conditions/post-traumatic-stress-disorder-ptsd/complex/ https://www.nhs.uk/mental-health/conditions/ptsd-post-traumatic-stress-disorder/
https://www.nhs.uk/mental-health/talking-therapies-medicine-treatments/medicines-and-psychiatry/antidepressants/side-effects/ https://www.nhs.uk/medicines/antidepressants/
https://www.nhs.uk/mental-health/talking-therapies-medicine-treatments/medicines-and-psychiatry/antidepressants/uses/ https://www.nhs.uk/medicines/antidepressants/
https://www.nhs.uk/mental-health/talking-therapies-medicine-treatments/medicines-and-psychiatry/ssri-antidepressants/dosage/ https://www.nhs.uk/medicines/antidepressants/
https://www.nhs.uk/mental-health/talking-therapies-medicine-treatments/medicines-and-psychiatry/ssri-antidepressants/side-effects/ https://www.nhs.uk/medicines/antidepressants/
https://www.nhs.uk/mental-health/talking-therapies-medicine-treatments/talking-therapies-and-counselling/nhs-talking-therapies/ https://www.nhs.uk/tests-and-treatments/talking-therapies/
https://www.nhs.uk/pregnancy/your-pregnancy-care/your-antenatal-appointments/ https://www.nhs.uk/pregnancy/your-pregnancy-care/your-antenatal-care-and-appointments/
https://www.nice.org.uk/guidance/cg126/chapter/1-guidance https://www.nice.org.uk/guidance/cg126
https://www.nice.org.uk/guidance/cg57/chapter/1-guidance https://www.nice.org.uk/guidance/cg57
https://www.nice.org.uk/guidance/ng28/chapter/recommendations https://www.nice.org.uk/guidance/ng28
https://www.nice.org.uk/guidance/ng49/chapter/recommendations https://www.nice.org.uk/guidance/ng49
https://www.nice.org.uk/guidance/ta775/chapter/1-Recommendations https://www.nice.org.uk/guidance/ta775
https://www.ouh.nhs.uk/patient-guide/leaflets/files/95363spironolactone.pdf https://www.ouh.nhs.uk/media/dv4kbb5m/95363spironolactone.pdf
https://www.pancreaticcancer.org.uk/information/signs-and-symptoms-of-pancreatic-cancer/ https://www.pancreaticcancer.org.uk/information-and-support/signs-and-symptoms-of-pancreatic-cancer/
https://www.psoriasis-association.org.uk/types-of-psoriasis https://psoriasisuk.org.uk/information-and-support/page.aspx?ID=11
https://versusarthritis.org/about-arthritis/treatments/drugs/hydroxychloroquine https://www.arthritis-uk.org/information-and-support/understanding-arthritis/arthritis-treatments/drugs/hydroxychloroquine/
https://weather.metoffice.gov.uk/warnings-and-advice/seasonal-advice/health-wellbeing/pollen/when-is-hayfever-season https://www.metoffice.gov.uk/blog/2025/what-are-the-different-types-of-pollen
https://www.britishlivertrust.org.uk/liver-information/tests-and-screening/liver-blood-tests-formerly-lfts/ https://britishlivertrust.org.uk/information-and-support/living-with-a-liver-condition/liver-blood-tests/
https://www.fda.gov/Drugs/DrugSafety/ucm594232.htm https://www.fda.gov/files/FDA-limits-packaging-for-anti-diarrhea-medicine-loperamide-(Imodium)-to-encourage-safe-use_PDF.pdf
https://www.nhs.uk/conditions/pre-eclampsia/symptoms/ https://www.nhs.uk/conditions/pre-eclampsia/
https://apps.who.int/mediacentre/commentaries/stop-antibiotic-resistance/en/index.html https://www.who.int/news-room/questions-and-answers/item/antimicrobial-resistance-does-stopping-a-course-of-antibiotics-early-lead-to-antibiotic-resistance
"""
DROP_URLS = {"https://www.nhs.uk/common-health-questions/medicines/does-grapefruit-affect-my-medicine/",      # redirects to the medicines index: the page is gone
             "https://www.food.gov.uk/research/food-allergy-and-intolerance-research/patterns-and-prevalence-of-adult-food-allergy",     # 404; the prose cites the Anaphylaxis UK report of it
             "https://swlimo.southwestlondon.icb.nhs.uk/wp-content/uploads/Tirzepatide-information-sheet-v1.0.pdf"}                     # 404; the sentence that cited it is removed (TEXT)
# a replaced reference keeps its place in the list; where the page changed its name the title follows
RETITLE = {
    "https://www.metoffice.gov.uk/blog/2025/what-are-the-different-types-of-pollen": "Met Office: Pollen: what are the different types?",
    "https://www.who.int/news-room/questions-and-answers/item/antimicrobial-resistance-does-stopping-a-course-of-antibiotics-early-lead-to-antibiotic-resistance": "WHO: Does stopping a course of antibiotics early lead to antibiotic resistance?",
}

# ---- 2. prose ---------------------------------------------------------------------------------------------------------------------
# (file, old phrase, new phrase, how many times it must occur); an old phrase that starts with "^" only matches at the start of a string, which keeps
# an edit idempotent when the new text still contains the old phrase (a lead sentence put in front of the existing text)
TEXT = [
    ("content/conditions.json", "sometimes with a longer-acting type once a day, and the NHS says", "sometimes with a longer-acting type, and the NHS says", 1),
    ("content/blog/high-blood-pressure-what-happens-next.json", "Most blood pressure medicines are taken as tablets once a day.", "Most blood pressure medicines are taken as tablets.", 1),
    ("content/medications.json", "but packs of 50 mg tablets can be bought from a pharmacy", "but packs of tablets can be bought from a pharmacy", 1),
    ("content/medications.json", "The NHS says that if sumatriptan makes you feel very dizzy or tired, you should avoid driving until you feel better.",
     "The NHS says that if sumatriptan makes someone feel very dizzy or tired, they should avoid driving until they feel better.", 1),
    ("content/medications.json", "The NHS says 180mg tablets for treating hives are available from pharmacies.", "The NHS says tablets for treating hives are available from pharmacies.", 1),
    ("content/medications.json", "The NHS says most people take prednisolone once a day in the morning, because this stops it keeping them awake.", "The NHS says most people take prednisolone in the morning, because this stops it keeping them awake.", 1),
    ("content/medications.json", "Usually once a day in the morning.", "Usually taken in the morning.", 1),
    ("content/medications.json", "The NHS describes it as safe and very effective when used properly", "The NHS describes it as very effective when used properly", 1),
    ("content/conditions.json", "Most people take both a long-acting insulin, once or twice a day, and a rapid-acting insulin before meals.", "Most people take both a long-acting insulin and a rapid-acting insulin before meals.", 1),
    # sources that no longer exist: the sentence that cited a gone page is removed, or re-sourced to the page that replaced it
    ("content/medications.json", " A South West London NHS information sheet for prescribers warns that sickness and diarrhoea can lead to dehydration, which could worsen kidney function.", "", 1),
    ("content/blog/why-antibiotics-do-not-work-for-viruses.json",
     "A WHO commentary likewise advises patients to complete the prescribed course, because stopping early can favour drug-resistant bacteria. The same commentary says evidence is emerging that shorter courses may be effective for some infections and can slow resistance by reducing how long bacteria are exposed to antibiotics.",
     "A WHO question-and-answer page says shorter courses of antibiotics may be just as effective as longer courses for some infections, and that shorter treatment can slow resistance by reducing how long bacteria are exposed to antibiotics.", 1),
    ("content/blog/why-antibiotics-do-not-work-for-viruses.json",
     "A WHO commentary advises finishing a prescribed course but also says shorter courses may work for some infections, so sources differ in emphasis.",
     "WHO says shorter courses of antibiotics may work as well as longer ones for some infections, while an NHS page describes stopping a course early as a risk, so sources differ in emphasis.", 1),
    # a class summary is its page's lead and its search snippet: it must not start with a digit or repeat its medicine's summary
    ("content/drug-classes.json", "5-HT3 receptor antagonists are anti-sickness medicines; ondansetron is the member covered on this site.", "Anti-sickness medicines that block 5-HT3 receptors; ondansetron is the member covered on this site.", 1),
    ("content/drug-classes.json", "^Methotrexate is an immunosuppressant used for inflammatory conditions such as rheumatoid arthritis, psoriasis and Crohn's disease, and sometimes for cancer. The NHS says it calms",
     "Antimetabolite DMARDs are a group of disease-modifying medicines; methotrexate is the member covered on this site. Methotrexate is an immunosuppressant used for inflammatory conditions such as rheumatoid arthritis, psoriasis and Crohn's disease, and sometimes for cancer. The NHS says it calms", 1),
]

# ---- 3. links ---------------------------------------------------------------------------------------------------------------------
# (collection file, root key or None, entity id, field, value to set when the field is empty)
LINKS = [
    ("content/conditions.json", None, "chlamydia", "tests", ["microbiology-tests"]),
    ("content/conditions.json", None, "chlamydia", "medications", ["azithromycin"]),
]

# ---- 4. categories ----------------------------------------------------------------------------------------------------------------
# The author batches filed everything that was not one organ system under the catch-all "other"; the filter chips on /conditions/ and the
# category tag on every card come from it. These conditions move to the group a reader would look in (only while they are still "other").
CATEGORIES = {
    "mental-health": ["anxiety-disorders", "depression", "adhd", "autism", "ocd", "ptsd", "bipolar-disorder", "insomnia"],
    "skin": ["eczema", "psoriasis", "acne", "hives", "cellulitis", "food-allergy", "conjunctivitis"],
    "infection": ["influenza", "shingles", "covid-19", "tonsillitis", "ear-infection", "thrush", "hiv", "gonorrhoea", "genital-herpes", "sepsis"],
}


def load(path):
    if os.path.basename(os.path.dirname(path)) == 'blog': return json.load(open(path, encoding='utf-8')), None
    return cb.load_styled(path)


def save(path, d, style):
    if style is None: json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    else: cb.save_styled(path, d, style)


def walk_refs(d, fn):
    """Call fn(refs_list) -> (new_list, changed) on every `references` list in the document."""
    n = 0
    def w(o):
        nonlocal n
        if isinstance(o, dict):
            if isinstance(o.get('references'), list):
                new, ch = fn(o['references'])
                if ch: o['references'] = new; n += 1
            for v in o.values(): w(v)
        elif isinstance(o, list):
            for v in o: w(v)
    w(d); return n


def main():
    pairs = dict(l.split() for l in REDIRECTS.strip().splitlines())
    finals = set(pairs.values())
    files = sorted(glob.glob(os.path.join(ROOT, 'content', '*.json')) + glob.glob(os.path.join(ROOT, 'content', 'blog', '*.json')))
    replaced = merged = 0
    for f in files:
        raw = open(f, encoding='utf-8').read(); new = raw
        for old, fin in pairs.items():
            q = '"' + old + '"'
            if q in new: replaced += new.count(q); new = new.replace(q, '"' + fin + '"')
        if new != raw: open(f, 'w', encoding='utf-8').write(new)

    def tidy(refs):
        out, seen, changed = [], {}, False
        for r in refs:
            if not isinstance(r, dict): out.append(r); continue
            u = r.get('url')
            if u in DROP_URLS: changed = True; continue
            if u in finals and u in seen:
                first = seen[u]; changed = True
                t = re.sub(r'^NHS:\s*', '', r.get('title', ''))
                parts = first['section'].split('; ') if first.get('section') else []
                for a in ([r['section']] if r.get('section') else [t]):
                    if a and a not in parts and a != re.sub(r'^NHS:\s*', '', first.get('title', '')): parts.append(a)
                if parts: first['section'] = '; '.join(parts)
                continue
            if u in finals: seen[u] = r
            out.append(r)
        return out, changed
    for f in files:
        d, st = load(f)
        n = walk_refs(d, tidy)
        if n: save(f, d, st); merged += n
    def retitle(refs):
        changed = False
        for r in refs:
            if isinstance(r, dict) and r.get('url') in RETITLE and r.get('title') != RETITLE[r['url']]: r['title'] = RETITLE[r['url']]; changed = True
        return refs, changed
    retitled = 0
    for f in files:
        d, st = load(f)
        if walk_refs(d, retitle): save(f, d, st); retitled += 1
    edits = 0
    for rel, old, new, expect in TEXT:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path): continue
        d, st = load(path); count = 0
        anchored = old.startswith('^'); needle = old[1:] if anchored else old
        def hit(v): return isinstance(v, str) and (v.startswith(needle) if anchored else needle in v)
        def sub(v): return new + v[len(needle):] if anchored else v.replace(needle, new)
        def w(o):
            nonlocal count
            if isinstance(o, dict):
                for k, v in o.items():
                    if hit(v): o[k] = sub(v); count += 1 if anchored else v.count(needle)
                    else: w(v)
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    if hit(v): o[i] = sub(v); count += 1 if anchored else v.count(needle)
                    else: w(v)
        w(d)
        if count: save(path, d, st); edits += count
    linked = 0
    for rel, rk, eid, field, value in LINKS:
        d, st = cb.load_styled(os.path.join(ROOT, rel)); items = d if rk is None else d[rk]
        if eid in items and not items[eid].get(field): items[eid][field] = value; cb.save_styled(os.path.join(ROOT, rel), d, st); linked += 1
    moved = 0
    d, st = cb.load_styled(os.path.join(ROOT, 'content', 'conditions.json'))
    for cat, ids in CATEGORIES.items():
        for eid in ids:
            if eid in d and d[eid].get('category') == 'other': d[eid]['category'] = cat; moved += 1
    if moved: cb.save_styled(os.path.join(ROOT, 'content', 'conditions.json'), d, st)
    print(f'references: {replaced} URLs updated, {merged} reference lists tidied, {retitled} retitled; prose: {edits} phrase(s) rewritten; links: {linked} group(s) added; categories: {moved} condition(s) moved out of "other". Now run python3 tools/build-content.py')


if __name__ == '__main__': main()
