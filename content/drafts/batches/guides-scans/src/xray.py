from common import S, P
G = dict(
slug="x-ray-what-to-expect", name="X-ray: what to expect, safety and results",
summary="An X-ray uses a small beam of radiation to picture bones, lungs and other parts. This guide covers the test, radiation risk, pregnancy and results.",
links=dict(imaging=["x-ray","ct-scan","dxa-scan"], tests=[], conditions=[], symptoms=[], physiology=[], health=[]),
anatomy=dict(organs=["lungs","rib-cage"], systems=["skeleton","respiratory"]),
refs=["nhs_xray","nth_xray","glos_xray_preg","leic_xray_preg","ncic_xray"],
keyPoints=[
 S("An X-ray can produce images of many parts of the body, and the NHS lists fractures, teeth, lungs and the digestive system among them.","nhs_xray","NHS X-ray page."),
 S("The NHS describes X-rays as safe, with serious complications rare and a very small cancer risk linked to having lots of them.","nhs_xray","NHS X-ray page."),
 S("Trust leaflets say X-rays in pregnancy do not raise the risk of miscarriage or birth defects, and that those of the abdomen and pelvis are usually avoided.","leic_xray_preg glos_xray_preg","Leicester / Gloucestershire leaflets."),
 S("Results may be given on the same day or at an appointment some weeks later, depending on the type of X-ray.","nhs_xray","NHS X-ray page."),
],
sections=[
("What is an X-ray used for?",[
 S("An X-ray uses a beam of electromagnetic radiation to make an image of the inside of the body.","ncic_xray nth_xray","North Cumbria leaflet summary."),
 S("According to the NHS, X-rays can produce images of many parts of the body, including bones, teeth, lungs and the digestive system.","nhs_xray","NHS X-ray page."),
 S("They are used, for example, to check for broken bones after an accident.","nhs_xray","NHS X-ray page."),
 S("A trust leaflet says that specially trained staff check each request first, to confirm the test is the right one for the person and their condition.","ncic_xray","North Cumbria leaflet."),
]),
("What happens during an X-ray?",[
 S("The health professional who takes X-rays in hospital is called a radiographer.","nhs_xray","NHS X-ray page."),
 S("The radiographer positions the person sitting, lying or standing, depending on the part of the body.","ncic_xray","Summary: positions you sitting, lying or standing."),
 S("The X-ray itself takes only a few minutes, according to the NHS.","nhs_xray","NHS X-ray page."),
 S("The NHS says people are asked to remove metal items such as jewellery and zips.","nhs_xray","NHS X-ray page."),
 S("Some types need fasting for several hours beforehand.","nhs_xray","NHS X-ray page: not eat or drink for several hours before (for some types)."),
]),
("Which other tests use X-rays?",[
 S("The NHS lists several related tests, including angiography, which checks blood vessels using a dye injected into the blood.","nhs_xray","NHS X-ray page."),
 S("It also lists DEXA scans, which measure bone density, and CT scans, which give more detailed images.","nhs_xray","NHS X-ray page."),
 S("Studies of the digestive system use a barium drink or enema, a liquid that shows up on X-ray.","nhs_xray","NHS X-ray page: barium."),
 S("After a dye or barium test, the NHS says people may be asked to wait for up to 30 minutes so staff can check for a reaction.","nhs_xray","NHS X-ray page."),
]),
("How much radiation is involved?",[
 S("The NHS says X-rays are safe and serious complications are rare.","nhs_xray","NHS X-ray page."),
 S("It adds that there is a very small risk of cancer linked to having lots of X-rays.","nhs_xray","NHS X-ray page."),
 S("Trust leaflets say staff keep doses as low as possible and that a test goes ahead only when its benefit outweighs the small risk.","nth_xray ncic_xray","Summary: doses as low as possible; benefit outweighs small risk."),
 S("GOV.UK safety advice says that when imaging is properly justified and optimised, the risks from X-ray examinations are far smaller than the risks of the conditions being investigated.","gov_rad","GOV.UK summary (index 7-4)."),
 S("It describes the added chance of cancer as very small, and says any effect would appear years or decades later.","gov_rad","GOV.UK summary (index 7-5)."),
 S("The same advice says children have a higher lifetime risk from X-rays than adults, and that risk is lower for older patients because cancers take a long time to develop.","gov_rad","GOV.UK summary (7-7, 7-8)."),
 S("These leaflets give their own figures for the risk, and the figures differ between leaflets, so the radiographer or the doctor who requested the test is the person to ask.","nth_xray ncic_xray glos_xray_preg","Summary caveat: sources differ in numerical risk figures."),
]),
("Are X-rays safe in pregnancy?",[
 S("Trusts ask anyone who might be pregnant to tell the team before an X-ray.","glos_xray_preg leic_xray_preg","Summary."),
 S("A Leicester hospitals leaflet says X-rays during pregnancy do not increase the risk of miscarriage, birth defects or developmental problems.","leic_xray_preg","Leicester leaflet."),
 S("The main concern it names is a very small increase in the chance that the baby develops cancer in childhood.","leic_xray_preg","Leicester leaflet."),
 S("X-rays of the abdomen and pelvis are usually avoided in pregnancy.","leic_xray_preg glos_xray_preg","Summary."),
 S("X-rays of parts of the body well away from the abdomen, such as arms and legs, and dental X-rays, do not give any increased risk to an unborn baby, according to the same leaflet.","leic_xray_preg","Leicester leaflet."),
 S("When an urgent test is needed, a radiologist and the doctor who asked for it decide together whether it should go ahead.","leic_xray_preg","Leicester leaflet."),
]),
("How and when do results come back?",[
 S("A reporting radiographer or a radiologist, a doctor who specialises in imaging, reviews the X-ray.","nth_xray leic_xray_preg","Summary: reviewed by reporting radiographer or radiologist."),
 S("The report goes to the team that requested the test.","nth_xray","Summary."),
 S("The NHS says results may come on the same day or at an appointment a few weeks later, and that a clinician should explain them.","nhs_xray","NHS X-ray page."),
 S("The wait varies with how urgent the X-ray is.","nth_xray","Summary: timeframe varies depending on urgency."),
]),
])
