from common import S, P
G = dict(
slug="spirometry-lung-function-test-explained", name="Spirometry: the lung function test explained",
summary="Spirometry measures how much air the lungs hold and how fast it can be blown out. This guide covers the test, preparation and what results are compared with.",
links=dict(tests=["spirometry","pulmonary-function-tests"], conditions=["asthma","copd"], symptoms=["shortness-of-breath","cough"], physiology=["lung-volumes","breathing"], imaging=[], health=[]),
anatomy=dict(organs=["lungs"], systems=["respiratory"]),
refs=["kr_lung","royalfree_lung","forum_spiro","mlp_lung"],
keyPoints=[
 S("In spirometry the person breathes through a mouthpiece, with a nose clip, into a machine that measures airflow.","kr_lung forum_spiro","Summary."),
 S("Each blow is repeated at least three times, with rests in between.","kr_lung royalfree_lung","Summary."),
 S("Results are compared with values predicted for someone of the same height, age and sex.","royalfree_lung kr_lung","Summary."),
 S("The test may be repeated after a reliever inhaler to see whether the airways open up.","forum_spiro royalfree_lung","Summary."),
],
sections=[
("What is spirometry?",[
 S("Spirometry is the most common lung function test.","royalfree_lung forum_spiro","Summary."),
 S("It measures how much air the lungs can hold and how quickly air can be blown out.","mlp_lung royalfree_lung","Summary + MedlinePlus; wording textbook-level.","textbook"),
 S("Lung function tests give an indication of the capacity of the lungs and how clear the airways are.","royalfree_lung","Summary."),
]),
("What happens during the test?",[
 S("The person wears a nose clip so air goes through the mouth, and breathes through a mouthpiece into the lung function machine.","kr_lung forum_spiro","Summary."),
 S("They breathe normally, take a deep breath in, and then blow out as hard and fast as possible.","kr_lung royalfree_lung","Summary."),
 S("Each blow is repeated at least three times, with enough rest in between.","kr_lung","Summary."),
 S("The test usually takes about 15 minutes.","forum_spiro","Summary."),
]),
("How do people prepare?",[
 S("One NHS practice suggests avoiding vigorous exercise for 30 minutes before the test.","forum_spiro","Summary."),
 S("The same guidance suggests wearing loose clothing, removing loose-fitting dentures and chewing gum, and emptying the bladder.","forum_spiro","Summary."),
 S("It also asks people to tell staff about a recent chest infection that needed antibiotics or steroids, or a heart attack in the last three months.","forum_spiro","Summary."),
 S("Practices differ, so the appointment letter has the exact instructions.","forum_spiro kr_lung","Summary.","textbook"),
]),
("What is the reliever step?",[
 S("The test is often repeated after a reliever inhaler to check whether it helps the airways.","forum_spiro royalfree_lung","Summary."),
 S("The person takes the test, uses the inhaler, waits a short time and repeats the test.","forum_spiro","Summary."),
 S("A clear improvement suggests that the airways respond to the medicine, which supports a diagnosis of asthma.","royalfree_lung","Summary."),
]),
("What do the results show?",[
 S("Results are compared with predicted values for someone of the same height, age and sex.","royalfree_lung kr_lung","Summary."),
 S("The laboratory report shows the reference values used for the comparison.","royalfree_lung","Reworded per guide rules; no numbers."),
 S("In obstructive conditions such as asthma and chronic obstructive pulmonary disease (COPD), the airways narrow, making it harder for air to flow out of the lungs.","royalfree_lung kr_lung","Summary."),
 S("Restrictive conditions are different, because they decrease the amount of air the lungs can hold.","royalfree_lung kr_lung","Summary."),
 S("A respiratory doctor reviews the results and, if needed, arranges a follow-up appointment to explain them.","kr_lung","Summary."),
 S("If no follow-up is needed, the results go directly to the GP.","kr_lung","Summary."),
]),
("Are there any risks?",[
 S("NHS leaflets say there are no direct risks from lung function tests.","kr_lung royalfree_lung","Summary."),
 S("The effort can be tiring, and people are given time to recover between tests.","kr_lung","Summary."),
 S("Some people feel dizzy or faint, and coughing is common.","kr_lung","Summary."),
]),
])
