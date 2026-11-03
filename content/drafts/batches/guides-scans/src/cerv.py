from common import S, P
G = dict(
slug="cervical-screening-what-to-expect", name="Cervical screening: what happens and results",
summary="Cervical screening checks a sample from the cervix for high-risk HPV. This guide covers who is invited, the appointment and what each result means.",
links=dict(tests=["cervical-screening"], conditions=["cervical-cancer"], health=["womens-health"], symptoms=["vaginal-bleeding"], physiology=[], imaging=[]),
anatomy=dict(organs=["uterus","vagina"], systems=["reproductive-female"]),
refs=["nhs_cerv","nhs_cerv_when","nhs_cerv_what","nhs_cerv_res","nhs_colpo"],
keyPoints=[
 S("The NHS in England invites people with a cervix aged 25 to 64 for cervical screening.","nhs_cerv_when","Summary."),
 S("The sample is tested first for high-risk human papillomavirus (HPV), the virus that can lead to cell changes.","nhs_cerv_what nhs_cerv_res","Summary."),
 S("A negative HPV result means the risk of cervical cancer is very low, and the next routine test is usually in five years.","nhs_cerv_res","Summary."),
 S("Most people who have a colposcopy do not have cervical cancer.","nhs_colpo","Summary."),
],
sections=[
("Who is invited and how often?",[
 S("The NHS invites people with a cervix aged 25 to 64 in England, and the first invitation arrives a few months before the 25th birthday.","nhs_cerv_when","Summary."),
 S("People registered as female with a GP are invited automatically.","nhs_cerv_when","Summary."),
 S("Trans men and non-binary people who are registered differently may need to ask through their GP or a sexual health or transgender clinic.","nhs_cerv_when","Summary."),
 S("Routine screening is every five years.","nhs_cerv_when","Summary."),
 S("Since 1 July 2025, people aged 25 to 49 with a negative HPV test have moved from a three-year to a five-year interval.","nhs_cerv_when","Summary."),
 S("Invitations usually stop at 65, and a person is invited again only if a recent test was abnormal.","nhs_cerv_when","Summary: sources differ on details."),
]),
("What happens at the appointment?",[
 S("Most screening takes place at a GP surgery, and a person can ask for a female nurse or doctor.","nhs_cerv_when","Summary."),
 S("The person undresses from the waist down behind a screen and lies back on a bed.","nhs_cerv_when","Summary."),
 S("The clinician gently puts a smooth, tube-shaped tool called a speculum into the vagina, and a soft brush collects a sample of cells from the cervix.","nhs_cerv_what","Summary."),
 S("The test itself takes under five minutes, and the whole appointment is about ten minutes.","nhs_cerv_what","Summary."),
 S("People can ask for a smaller speculum, ask to stop at any time, or ask to insert the speculum themselves.","nhs_cerv_what","Summary."),
 S("Light spotting for a few hours afterwards is normal.","nhs_cerv_what","Summary."),
]),
("Why is the sample tested for HPV?",[
 S("Current NHS practice tests the sample for high-risk HPV first.","nhs_cerv_res","Summary."),
 S("The NHS England guide says high-risk HPV can cause abnormal cell changes that may lead to cervical cancer.","nhs_cerv_res nhs_cerv_what","Summary."),
 S("If HPV is found, the laboratory then looks more closely at the cells for changes.","nhs_cerv_res","Summary."),
]),
("What do the results mean?",[
 S("If no HPV is found, the NHS says the risk of cervical cancer is very low, and routine screening is usually five years later.","nhs_cerv_res","Summary."),
 S("If HPV is found but the cells are normal, the person is usually retested in about 12 months.","nhs_cerv_res","Summary."),
 S("If HPV continues after two years, an invitation for a colposcopy follows.","nhs_cerv_res","Summary."),
 S("If HPV is found with abnormal cells, the person is referred for a colposcopy.","nhs_cerv_res","Summary."),
 S("An unclear sample means a repeat test, which does not mean anything is wrong.","nhs_cerv_res","Summary: 3 months; no number."),
 S("Results usually arrive by letter, and one source gives two weeks, sometimes longer.","nhs_cerv_res","Summary: results timing from one source."),
]),
("What is a colposcopy?",[
 S("A colposcopy is a closer look at the cervix, done in a hospital or clinic.","nhs_colpo","Summary."),
 S("The NHS says most people who have one do not have cervical cancer.","nhs_colpo nhs_cerv_res","Summary."),
 S("Biopsy results grade the cell changes: low-grade changes usually need no immediate treatment, and high-grade changes are offered treatment to remove the cells.","nhs_colpo","Summary."),
]),
("Bleeding or symptoms between screens",[
 S("Unusual vaginal bleeding, such as between periods or after sex, needs a GP appointment, because screening is not meant for symptoms.","nhs_cerv","Textbook signposting.","textbook"),
]),
])
