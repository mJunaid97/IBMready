from common import S, P
G = dict(
slug="breast-screening-mammogram-what-to-expect", name="Breast screening: who is invited and what happens",
summary="NHS breast screening uses mammograms to look for cancers too small to see or feel. This guide covers who is invited, the appointment, results and harms.",
links=dict(imaging=["mammography"], conditions=["breast-cancer"], symptoms=["breast-lump"], health=["womens-health"], tests=[], physiology=[]),
anatomy=dict(organs=["breasts"], systems=["reproductive-female"]),
refs=["nhs_br_who","nhs_br_when","nhs_br_appt","crukbr","crukmam"],
keyPoints=[
 S("The NHS offers breast screening from age 50 up to the 71st birthday, with invitations every three years.","nhs_br_when nhs_br_who","Summary."),
 S("A mammogram takes two X-rays of each breast, with each breast pressed between two plates.","nhs_br_appt crukmam","Summary."),
 S("Screening aims to find breast cancers at an early stage, when they are too small to see or feel, and it does not prevent breast cancer.","nhs_br_who crukbr","Summary."),
 S("Screening can miss a cancer and can raise false alarms, and some people are diagnosed with a cancer that would never have caused harm.","crukbr nhs_br_who","Summary."),
],
sections=[
("Who is invited for breast screening?",[
 S("The NHS says screening is offered from age 50 up to the 71st birthday.","nhs_br_when","Summary."),
 S("The first invitation comes between the ages of 50 and 53, and further invitations follow every three years until the 71st birthday.","nhs_br_when","Summary."),
 S("Anyone registered with a GP as female is invited automatically.","nhs_br_who","Summary."),
 S("People over 71 are not invited automatically but can ask for screening every three years.","nhs_br_when","Summary."),
 S("For trans and non-binary people, invitations depend on the sex registered with the GP, and the NHS says people who have taken feminising hormones for more than two years can have screening.","nhs_br_who","Summary."),
]),
("What happens at the appointment?",[
 S("A mammogram takes two X-rays of each breast.","nhs_br_appt crukmam","Summary."),
 S("Each breast is pressed between two plates, which is likely to be uncomfortable, and some people find it painful, but it is over quickly.","nhs_br_appt crukmam","Summary."),
 S("Sources describe an appointment as taking roughly 20 to 30 minutes, and one unit suggests allowing up to an hour.","nhs_br_appt","Summary."),
]),
("How and when are the results given?",[
 S("Results usually come within two weeks of the appointment and are also sent to the GP.","nhs_br_appt crukbr","Summary."),
 S("A normal result means another invitation in three years.","nhs_br_appt","Summary."),
 S("If the mammogram looks abnormal, the person is called back for more tests, such as a breast ultrasound scan or a biopsy.","nhs_br_appt crukbr","Summary."),
 S("The NHS says about four in every 100 women are asked to come back, and of these, one will be found to have cancer.","nhs_br_appt","Summary: 4 in 100; one will have cancer."),
]),
("What are the benefits?",[
 S("Screening aims to find breast cancers at an early stage, when they are too small to see or feel.","nhs_br_who crukbr","Summary."),
 S("It does not prevent breast cancer.","nhs_br_who","Summary."),
]),
("What are the harms and limits?",[
 S("Mammograms use a very low dose of X-rays, and the benefits are judged to greatly outweigh that risk.","crukmam nhs_br_who","Summary."),
 S("Screening does not always find a cancer that is there, so some people with breast cancer are missed.","nhs_br_who crukbr","Summary."),
 S("A mammogram can flag something in a person who does not have cancer, which can cause anxiety and lead to more tests such as a biopsy.","nhs_br_who crukbr","Summary."),
 S("Some people who are screened are diagnosed and treated for a breast cancer that would never have been found or caused them harm.","crukbr","Summary: overdiagnosis; no figure."),
]),
("What if there is a lump between screens?",[
 S("Screening is not a substitute for noticing changes, and a new lump, change in shape or nipple discharge needs a GP appointment, with no wait for the next invitation.","nhs_br_who","Textbook signposting; NHS page not retrieved on this point.","textbook"),
]),
])
