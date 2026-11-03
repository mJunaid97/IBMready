from common import S, P
G = dict(
slug="echocardiogram-types-and-what-it-shows", name="Echocardiogram: types, what happens and results",
summary="An echocardiogram uses ultrasound to picture the heart. This guide explains the standard, stress and throat versions and what each involves.",
links=dict(tests=["echocardiogram","ecg","stress-test"], imaging=["ultrasound"], conditions=["heart-failure"], symptoms=["shortness-of-breath"], physiology=["cardiac-output"], health=[]),
anatomy=dict(organs=["heart"], systems=["heart"]),
refs=["nhs_echo","mlp_echo","wales_echo","chel_toe"],
keyPoints=[
 S("The most common type is a transthoracic echocardiogram, in which a probe is placed over the chest.","nhs_echo","NHS echocardiogram page."),
 S("A stress echocardiogram is done during exercise or after a medicine that has a similar effect on the heart.","nhs_echo","NHS echocardiogram page."),
 S("A transoesophageal echocardiogram passes a probe down the throat and gives more detailed pictures than the standard test.","nhs_echo chel_toe","NHS page; Chelsea and Westminster."),
 S("Most people need no preparation for a standard echocardiogram, but may need to avoid eating for several hours before the throat version.","nhs_echo","NHS echocardiogram page."),
],
sections=[
("What is an echocardiogram?",[
 S("An echocardiogram is a scan that uses ultrasound, high-frequency sound waves, to produce moving pictures of the heart.","nhs_echo mlp_echo","NHS/MedlinePlus."),
 S("An ultrasound probe covered in water-based gel is placed on the chest in the standard test.","nhs_echo","NHS echo page."),
 S("The sources describe this test as causing little or no discomfort.","nhs_echo wales_echo","Summary."),
]),
("What are the types of echocardiogram?",[
 S("The most common type is the transthoracic echocardiogram, in which the probe is placed over the chest.","nhs_echo","NHS."),
 S("A transoesophageal echocardiogram uses a probe that passes down the throat and gives more detailed pictures of the heart than the standard test.","nhs_echo","NHS."),
 S("Doctors may use it when the standard test has not shown enough detail.","nhs_echo","NHS."),
 S("A stress echocardiogram is a transthoracic scan done during exercise on a treadmill or exercise bike, or after a medicine that has a similar effect on the heart.","nhs_echo","NHS."),
 S("A contrast echocardiogram uses a harmless substance injected into the bloodstream to produce a clearer image.","nhs_echo","NHS."),
 S("A stress echocardiogram may be recommended if a heart problem is triggered by physical activity.","nhs_echo","NHS/summary."),
]),
("What happens in the throat version?",[
 S("For the transoesophageal test, the back of the throat is numbed with an anaesthetic spray.","nhs_echo chel_toe","NHS/Chelsea."),
 S("People can ask for a sedative, a medicine that leaves them very drowsy but not asleep.","nhs_echo","NHS."),
 S("Avoiding food for several hours beforehand may be needed for this version.","nhs_echo","NHS."),
 S("Afterwards the throat may be sore, and this should pass within one or two days.","nhs_echo","NHS."),
]),
("What can an echocardiogram show?",[
 S("The NHS says the transoesophageal version can show problems with the heart valves, blood clots within the heart, problems with the aorta, and areas of heart muscle that are not working properly after a heart attack.","nhs_echo","NHS."),
 S("The more detailed pictures from this version can help to plan heart surgery.","nhs_echo","Summary."),
 S("A stress echocardiogram uses pictures taken while the heart is under stress to make a diagnosis.","nhs_echo","NHS."),
]),
("What does it check, and how long does it take?",[
 S("The British Heart Foundation says an echocardiogram uses ultrasound to show the size of the heart, how well it pumps and whether the valves are working.","bhf_echo","BHF Heart Matters page summary."),
 S("It describes the test as an important investigation for anyone with suspected heart failure, heart valve problems or cardiomyopathy, a disease of the heart muscle.","bhf_echo","BHF."),
 S("The test is painless and does not use radiation.","bhf_echo nhs_echo","Summary: painless, no radioactivity."),
 S("Sources give different times for the scan, and the NHS and the BHF give figures from about 20 minutes to about 45 minutes depending on the type.","bhf_echo nhs_echo","Summary: 20 min focused; 40-45 min BHF full; 30-40 NHS."),
]),
("When are the results given?",[
 S("Results are usually not given on the day, although a doctor may sometimes be able to talk through the findings the same day.","bhf_echo","BHF/leaflets summary."),
 S("Most people wait a few weeks, according to the leaflets retrieved.","bhf_echo","Summary: wait for a few weeks."),
 S("The sonographer, the specialist who performs the scan, writes a report that goes to the referring doctor, who discusses it with the person.","bhf_echo","Summary."),
 S("Some leaflets say that a person who has heard nothing after a few weeks should contact the doctor who referred them.","bhf_echo","Summary."),
]),
("Is any preparation needed?",[
 S("For a standard echocardiogram people usually need to do nothing to prepare.","nhs_echo","NHS."),
 S("The exception is the throat version, which may require avoiding eating for several hours.","nhs_echo","NHS."),
]),
])
