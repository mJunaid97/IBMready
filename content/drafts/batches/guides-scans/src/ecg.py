from common import S, P
G = dict(
slug="ecg-what-it-records-and-shows", name="ECG: what it records and what it can show",
summary="An ECG records the heart's electrical activity through patches on the skin. This guide covers the test, longer recordings, what it shows and its limits.",
links=dict(tests=["ecg","holter-monitor","stress-test","echocardiogram"], conditions=["myocardial-infarction","atrial-fibrillation"], symptoms=["chest-pain"], physiology=["cardiac-conduction","heart-rate"], imaging=[], health=[]),
anatomy=dict(organs=["heart"], systems=["heart"]),
refs=["nhs_ecg","bhf_ecg","wales_ecg","sussex_ecg","swbh_ecg","swbh_amb"],
keyPoints=[
 S("An ECG records the electrical activity of the heart, including its rate and rhythm.","bhf_ecg wales_ecg","BHF and NHS 111 Wales."),
 S("A standard ECG is quick and painless, and patches called electrodes are placed on the arms, legs and chest.","wales_ecg whit_ecg sussex_ecg","NHS 111 Wales: quick and painless; Sussex/Whittington."),
 S("A standard tracing can show an abnormal rhythm only if it is happening during the recording, which is why longer monitoring is sometimes used.","bhf_ecg","BHF."),
 S("An ECG can help to show whether someone is having a heart attack or has had one, but other tests may be needed to confirm a diagnosis.","bhf_ecg sussex_ecg","BHF; Sussex: limitations, further tests."),
],
sections=[
("What does an ECG record?",[
 S("An electrocardiogram, or ECG, records the electrical activity of the heart.","bhf_ecg wales_ecg","BHF/NHS 111 Wales."),
 S("The British Heart Foundation describes it as a simple test that records the heart's rhythm, its rate and its electrical activity.","bhf_ecg","BHF."),
 S("Each heartbeat is triggered by an electrical signal, and the machine picks these signals up through sensors on the skin.","sussex_ecg","Sussex: electrodes connected to machine that picks up the electrical signals from each heartbeat. Wording 'triggered' is textbook.","textbook"),
 S("The result is a graph of the signals.","swbh_ecg","SWBH: machine turns signals into a printed graph."),
]),
("What happens during a standard ECG?",[
 S("Sticky patches called electrodes are placed on the arms, legs and chest and connected to the machine.","sussex_ecg wales_ecg","Sussex/NHS 111 Wales."),
 S("A standard 12-lead test uses about ten electrodes to produce twelve views of the heart's signals.","swbh_ecg","SWBH leaflet summary: about 10 electrodes, 12 signals. Second pass check."),
 S("NHS 111 Wales describes the test as usually quick and painless.","wales_ecg","NHS 111 Wales."),
 S("A Whittington Health page says it takes about ten minutes and is not uncomfortable.","whit_ecg","Whittington."),
 S("A trust leaflet says the skin may be lightly abraded or shaved so the patches stick, and that creams or oils should not be used on the day.","swbh_ecg","SWBH."),
 S("The same leaflet stresses staying relaxed and still, because muscle movement can disturb the recording.","swbh_ecg","SWBH."),
 S("Trust pages differ on preparation: one says none is needed, and another says people can eat and drink as normal.","sussex_ecg whit_ecg","Summary: Sussex no prep; another eat and drink as normal."),
]),
("What can an ECG show?",[
 S("The British Heart Foundation says an ECG can help doctors to tell whether someone is having a heart attack or has had one in the past.","bhf_ecg","BHF."),
 S("Trust factsheets list abnormal heart rhythms, called arrhythmias, coronary heart disease, heart attacks and cardiomyopathy, a disease of the heart muscle, among the conditions it can help to diagnose or monitor.","sussex_ecg","Sussex factsheet summary."),
 S("The tracing can also show features that suggest a person may be at risk of an abnormal rhythm, according to the BHF.","bhf_ecg","BHF."),
]),
("What are the limits of a standard ECG?",[
 S("A standard ECG captures only what happens while it is recording.","bhf_ecg","BHF."),
 S("It can show an abnormal rhythm only if the rhythm is happening at that time.","bhf_ecg","BHF."),
 S("A Sussex factsheet notes that the test has limitations, so further tests may be needed to confirm a diagnosis.","sussex_ecg","Sussex."),
 S("That is why longer recordings or other heart tests are sometimes arranged.","bhf_ecg","BHF: ambulatory used for intermittent symptoms."),
]),
("What are longer and exercise ECGs?",[
 S("An ambulatory ECG, sometimes called Holter monitoring, records the heart's electrical activity continuously while the person goes about daily life.","bhf_ecg swbh_amb","BHF/SWBH."),
 S("The BHF says it records for 24 to 48 hours, sometimes longer.","bhf_ecg","BHF summary (numbers stated by source)."),
 S("It is used for symptoms that come and go, such as palpitations, and it can help to diagnose conditions such as atrial fibrillation, an irregular heart rhythm.","bhf_ecg","BHF."),
 S("One NHS summary says the length of wear is decided by the consultant or GP and can be between 24 hours and seven days.","wales_ecg swbh_amb","Summary."),
 S("An exercise ECG monitors the heart while the person exercises and the heart is working harder.","bhf_ecg","BHF."),
 S("The BHF describes it as an ECG recorded while the person walks on a treadmill or cycles, and says it shows whether the heart muscle is getting enough blood through the coronary arteries during activity.","bhf_exe","BHF exercise ECG page."),
 S("Doctors often use it to look into symptoms such as chest pain, palpitations, dizziness and breathlessness.","bhf_exe","BHF."),
 S("It is also used after procedures such as angioplasty, and to help set exercise levels for cardiac rehabilitation.","bhf_exe","BHF."),
 S("The person walks or cycles at a gentle pace that gets harder over time, and can stop at any point if they feel unwell.","bhf_exe","BHF."),
]),
("How do the results reach the person?",[
 S("The report goes to the doctor who requested the ECG.","wales_ecg sussex_ecg","Summary."),
 S("That doctor then contacts the person to discuss the result.","sussex_ecg","Summary."),
 S("For the exercise test, the BHF says the results are sent to the person's doctor, and that the wait can range from a few days to a few weeks.","bhf_exe","BHF."),
 S("Anyone with chest pain that is severe, spreading or accompanied by breathlessness should call 999 and not wait for a test appointment.","nhs_ecg","Textbook emergency signposting; NHS chest pain guidance not retrieved.","textbook"),
]),
])
