from common import S, P
G = dict(
slug="colonoscopy-preparation-and-what-happens", name="Colonoscopy: preparation and what happens",
summary="A colonoscopy uses a thin camera to look inside the large bowel. This guide covers bowel preparation, sedation, risks and when results arrive.",
links=dict(procedures=["colonoscopy"], tests=["endoscopy","biopsy"], conditions=["colorectal-cancer","inflammatory-bowel-disease"], symptoms=["abdominal-pain"], physiology=[], imaging=[], health=[]),
anatomy=dict(organs=["large-intestine"], systems=["digestive"]),
refs=["nhs_colo","nhs_colo_why","cruk_colo","hey_colo","royalfree_colo","cht_colo_prep"],
keyPoints=[
 S("A colonoscopy passes a thin, flexible tube with a camera through the bowel to look for the cause of symptoms, to screen for bowel cancer, or to follow up earlier problems.","nhs_colo_why hey_colo","NHS why it's done; trust leaflet."),
 S("The bowel must be empty for a clear view, so a laxative preparation is taken beforehand and often causes frequent diarrhoea.","cht_colo_prep royalfree_colo","Trust prep leaflets."),
 S("Polyps, which are growths on the bowel lining, can be removed during the test and examined under a microscope.","nhs_colo hey_colo","Summary."),
 S("Perforation, a tear in the bowel wall, is the main serious risk and is uncommon, with higher risk when polyps are removed.","hey_colo royalfree_colo","Trust leaflets."),
],
sections=[
("Why is a colonoscopy done?",[
 S("The NHS says a colonoscopy is often done to find the cause of bowel symptoms.","nhs_colo_why","NHS page summary."),
 S("Other reasons include looking for early signs of bowel cancer in people at high risk, and checking after earlier treatment for bowel cancer.","nhs_colo_why","NHS page."),
 S("People who have had polyps removed before, or who have a family history of bowel cancer, may also be referred.","nhs_colo_why","NHS page."),
]),
("How is the bowel prepared?",[
 S("For a clear view, the bowel needs to be empty.","cht_colo_prep","Trust leaflets."),
 S("Trusts generally prescribe a laxative solution, often a powder mixed with water, to empty the bowel.","cht_colo_prep royalfree_colo","Summary."),
 S("One trust describes the preparation as taking laxatives, cutting down on fibre, and stopping all food in the last few hours beforehand.","cht_colo_prep","Summary."),
 S("Leaflets warn of frequent diarrhoea, cramping and nausea, and advise staying near a toilet.","cht_colo_prep","Summary."),
 S("One trust notes that the laxative can cause dehydration, light-headedness, low blood pressure or kidney problems.","cht_colo_prep","Summary: another notes."),
 S("Preparation details differ between trusts, and the hospital sends its own instructions.","cht_colo_prep royalfree_colo","Summary differences (low fibre diet 3 days at some).","textbook"),
]),
("What happens during the procedure?",[
 S("A nurse sees the person first to discuss their medical history, carry out simple checks and explain what will happen.","royalfree_colo hey_colo","Summary."),
 S("A thin, flexible tube with a camera is passed through the anus and around the large bowel.","nhs_colo royalfree_colo","NHS/Royal Free."),
 S("Air is pumped in to open the bowel, which can cause bloating or cramps.","nhs_colo","NHS summary."),
 S("The NHS says a colonoscopy can be uncomfortable but should not be painful.","nhs_colo","NHS summary."),
 S("The procedure itself takes about 30 to 45 minutes, and a person may be at the hospital for about two hours in total.","nhs_colo royalfree_colo","NHS 30-45 min; two hours at hospital."),
 S("A leaflet says some people have sedation, some breathe a pain-relieving gas called Entonox, and some have no pain relief.","royalfree_colo","Summary: sedation, Entonox or no anaesthetic."),
 S("Sedation is given through a small needle in the back of the hand.","royalfree_colo","Summary."),
]),
("What are polyps and biopsies?",[
 S("Polyps are growths on the bowel lining, and they are usually not cancer.","nhs_colo","Summary: benign (not cancer). 'usually' softens; check."),
 S("It is not possible to tell by looking whether a polyp contains cancer cells, so polyps are removed and examined under a microscope.","nhs_colo","Summary."),
 S("Staff can also take small tissue samples, called biopsies, which is painless.","royalfree_colo hey_colo","Summary."),
 S("Afterwards the person is usually told whether any polyps were removed or samples taken.","nhs_colo","Summary."),
]),
("What are the risks?",[
 S("The NHS describes colonoscopy as a common and straightforward procedure.","nhs_colo","Summary."),
 S("The main risks are a tear in the bowel wall, called perforation, and bleeding.","nhs_colo hey_colo","Summary."),
 S("Trust leaflets give perforation figures that differ, and one says it happens to about one person in 1,000 nationally.","hey_colo royalfree_colo","Summary: 1 in 2511 vs about 1 in 1000. Number conditional."),
 S("The risk rises when polyps are removed, especially large or complex ones.","hey_colo","Summary."),
 S("Sometimes a hole can be closed with clips during the procedure.","hey_colo","Summary."),
 S("It is common to pass a small amount of blood from the anus after a biopsy or polyp removal.","hey_colo","Summary."),
 S("Colonoscopy is very accurate, but occasionally a problem, including rarely a cancer, can be missed.","hey_colo royalfree_colo","Summary."),
 S("Severe belly pain, heavy bleeding or a fever after the test needs urgent help: NHS 111 or the hospital unit, and 999 if it is severe.","nhs_colo","Textbook signposting.","textbook"),
]),
("When do the results come?",[
 S("A letter or call with the results usually comes two to three weeks after a colonoscopy.","hey_colo","Summary."),
 S("A normal result means no polyps or cancer were found in the bowel.","hey_colo","Summary."),
 S("If a biopsy was taken, the biopsy results can take up to two weeks.","hey_colo","Summary."),
]),
])
