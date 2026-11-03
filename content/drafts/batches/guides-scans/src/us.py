from common import S, P
G = dict(
slug="ultrasound-scan-what-to-expect", name="Ultrasound scan: what happens and is it safe",
summary="An ultrasound scan uses sound waves, not radiation, to make live pictures. This guide covers the gel, the full bladder, internal scans and results.",
links=dict(imaging=["ultrasound"], tests=["echocardiogram"], conditions=[], symptoms=[], physiology=[], health=[]),
anatomy=dict(organs=["kidneys","bladder"], systems=["urinary"]),
refs=["nhs_us","nhs_us_preg","nbt_us","uhb_us","rd_us","nth_pelv_us"],
keyPoints=[
 S("An ultrasound scan uses sound waves rather than radiation, and NHS leaflets describe it as low risk.","nbt_us rd_us","NBT: no radiation, safe; Royal Devon: sound waves."),
 S("A water-based gel goes on the skin, and a small probe is moved over the area being scanned.","nbt_us","NBT leaflet."),
 S("Scans of the pelvis, kidneys or bladder usually need a full bladder, and the appointment letter explains this.","nbt_us uhb_us","NBT/UHB: full bladder for pelvis, kidney or bladder scans."),
 S("Some people have an internal (transvaginal) scan to give more information.","nth_pelv_us","North Tees pelvic ultrasound leaflet."),
],
sections=[
("What is an ultrasound scan?",[
 S("An ultrasound scan uses high-frequency sound waves to make a picture of the inside of the body.","rd_us","Royal Devon: sound waves create echoes picked up by a probe and turned into a moving image."),
 S("The sound waves bounce off different parts of the body, and the echoes are picked up by a probe and turned into a moving image.","rd_us","Royal Devon."),
 S("It does not use radiation or X-rays.","nbt_us rm_us","NBT: do not use radiation; Royal Marsden summary."),
 S("NHS pages say it helps doctors to examine symptoms, to see inside the body during other procedures, and to monitor pregnancy.","rm_us nhs_us_preg","Summary of Royal Marsden/NHS pages."),
 S("It can also help to guide a biopsy or the draining of fluid.","rm_us","Summary: guide biopsies and draining fluid."),
 S("Ultrasound is generally less effective than CT or MRI at imaging through bone or air.","rm_us","Summary limitation: less effective through bone or gas. Source blended; second pass to verify."),
]),
("What happens during the scan?",[
 S("The person lies on a couch, and the room may be dimmed so the screen is easier to see.","nbt_us uhb_us","Summary: couch, dimmed room."),
 S("Gel is put on the skin over the area, and the sonographer or radiologist moves a small probe over it while watching the pictures.","nbt_us","NBT."),
 S("The gel is water-based and washes off easily, and trust leaflets say it will not stain clothing.","nbt_us uhb_us","Summary."),
 S("Trust leaflets say the scan takes about 20 minutes in many cases, though the length depends on the area examined.","nbt_us leeds_us","Summary: about 20 minutes; Leeds 10-30."),
 S("Afterwards the gel is wiped off, the person can get dressed, and they can usually leave straight away.","nbt_us","NBT: usually able to leave straight after."),
]),
("Why do some scans need a full bladder?",[
 S("For scans of the pelvis, kidneys or bladder, people are usually asked to arrive with a full bladder.","nbt_us uhb_us","Summary."),
 S("One trust explains that a full bladder pushes the womb into a position that is easier to scan.","uhb_us","Summary: UHB explanation."),
 S("Leaflets ask people not to pass urine until after the scan, and say that anyone who becomes uncomfortably full during the scan can tell the staff and may be able to leave the room to empty their bladder before it is finished.","nbt_us uhb_us","Summary."),
 S("Scans of some organs, such as the liver, may need no food for several hours beforehand.","nbt_us","Summary: liver scan fasting."),
 S("The appointment letter gives the exact instructions for each type of scan.","nbt_us","Summary: check appointment letter. Weak; second pass.","textbook"),
]),
("What are the different kinds of ultrasound scan?",[
 S("The usual scan is external, with the probe on the skin.","nth_pelv_us","North Tees."),
 S("Some people have a transvaginal (internal) scan to provide more information about the pelvis.","nth_pelv_us","North Tees pelvic ultrasound."),
 S("For this scan the probe is disinfected, covered with a protective sheath and lubricated with gel.","nth_pelv_us","North Tees."),
 S("People usually need to empty their bladder first for an internal scan.","nth_pelv_us","Summary."),
 S("A bladder scan is a quick scan that measures the volume of urine in the bladder, and it is often used to check how well the bladder empties.","mersey_bladder","Mersey Care bladder scan leaflet."),
 S("Ultrasound can also be used to look at blood flow and at whether blood vessels are narrowed or blocked.","rm_us","Summary."),
]),
("Is an ultrasound scan safe?",[
 S("NHS leaflets describe ultrasound as safe and low risk, and one says it does not use radiation.","nbt_us","NBT."),
 S("The NHS pregnancy pages describe scans as painless and with no known side effects.","nhs_us_preg","Summary of NHS pregnancy page."),
 S("A possible minor problem is skin irritation or infection from the gel, which wiping the gel off thoroughly after the scan helps to prevent, according to one leaflet.","uhb_us","Summary: gel irritation/infection risk reduced by wiping."),
 S("People with a latex allergy are asked to tell the department beforehand so latex-free products can be used.","uhb_us","Summary."),
]),
("When are the results shared?",[
 S("A sonographer or radiologist interprets the pictures.","nbt_us","Summary."),
 S("The report goes to the doctor or team who requested the scan.","rm_us leeds_us","Summary."),
 S("One trust says the findings are combined with other clinical information and discussed with the person as part of their treatment plan.","nbt_us","Summary."),
 S("How soon a report is ready depends on the local service, and one trust says most reports are ready 24 hours after the scan.","leeds_us rd_us","Summary: most reports 24 h (one trust)."),
]),
])
