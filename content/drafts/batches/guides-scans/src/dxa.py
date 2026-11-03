from common import S, P
G = dict(
slug="dxa-bone-density-scan-explained", name="DXA bone density scan: what it shows",
summary="A DXA scan measures bone density at the hip and spine using very low-dose X-rays. This guide covers who is offered one and what the T-score does and does not decide.",
links=dict(imaging=["dxa-scan"], conditions=["osteoporosis","fracture"], tests=[], symptoms=[], physiology=[], health=[]),
anatomy=dict(organs=["spine","pelvic-girdle"], systems=["skeleton"]),
refs=["ros_dxa","ros_dxa_terms","mlp_dxa","wales_dexa","leeds_dexa","rm_dexa"],
keyPoints=[
 S("A DXA scan is painless: the person lies on a padded table while a scanning arm passes over the hips and spine.","ros_dxa wales_dexa leeds_dexa","Summary."),
 S("The radiation dose is low, and a Royal Marsden leaflet describes the added risk as extremely small.","rm_dexa","Summary."),
 S("The T-score compares bone density with that of a healthy young adult of the same sex.","ros_dxa_terms","Summary."),
 S("The decision to offer a medicine rests on the overall chance of breaking a bone in the next ten years, not on the scan result alone.","ros_dxa ros_dxa_terms","Summary."),
],
sections=[
("What is a DXA scan?",[
 S("DXA, also written DEXA, stands for dual-energy X-ray absorptiometry, a scan that measures bone density.","ros_dxa mlp_dxa","Title of ROS page; textbook expansion.","textbook"),
 S("The scan is used to help diagnose osteoporosis, a condition in which bones become weaker.","ros_dxa mlp_dxa","Summary."),
 S("The NHS lists DEXA among the tests that use X-rays.","nhs_xray","NHS X-ray page: DEXA for bone density."),
]),
("Who is offered one?",[
 S("NHS 111 Wales says a scan may be offered to people over 50 who are at risk of osteoporosis.","wales_dexa","Summary."),
 S("It also says people under 50 may be offered one if they have other risk factors, such as smoking or a previous broken bone.","wales_dexa","Summary."),
 S("A doctor usually makes the referral.","wales_dexa ros_dxa","Summary."),
 S("Results are combined with a fracture risk assessment rather than used alone.","ros_dxa","Summary."),
]),
("What happens during the scan?",[
 S("The person lies on their back on a padded table.","wales_dexa leeds_dexa","Summary."),
 S("A scanning arm passes over the body, usually the hips and spine, and the images go to a computer.","ros_dxa leeds_dexa","Summary."),
 S("The scan is painless and takes between about 5 and 15 minutes, depending on the sources and the body part scanned.","wales_dexa leeds_dexa rm_dexa","Summary: 5-10; five; 10-15."),
]),
("How much radiation is involved?",[
 S("The dose is low.","rm_dexa mlp_dxa","Summary."),
 S("A Royal Marsden leaflet describes the added risk as extremely small and says there are no side effects of bone density scanning.","rm_dexa","Summary."),
]),
("What do the T-score and Z-score mean?",[
 S("The T-score compares a person's bone density with that of a healthy young adult of the same sex.","ros_dxa_terms mlp_dxa","Summary."),
 S("Scores fall into bands described as normal, low bone density (osteopenia) and osteoporosis, and the laboratory report shows the bands used.","ros_dxa_terms","Summary; numbers omitted per rules."),
 S("Osteoporosis is diagnosed using the lowest T-score across the lumbar spine, the neck of the thigh bone and the total hip.","ros_dxa_terms","Summary."),
 S("The Z-score compares a person with others of the same age, and it is used mainly for premenopausal women, men under 50 and children.","ros_dxa_terms","Summary."),
]),
("Does the result decide treatment?",[
 S("A T-score does not decide treatment alone.","ros_dxa ros_dxa_terms","Summary."),
 S("The Royal Osteoporosis Society says the decision to offer a medicine is based on the overall chance of breaking a bone in the next ten years, rather than only on bone density.","ros_dxa","Summary."),
]),
])
