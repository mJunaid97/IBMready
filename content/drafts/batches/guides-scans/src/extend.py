import json
F=json.load(open('../fragment.json'))['blog']
def L(slug): return json.load(open(f'../ledgers/{slug}.ledger.json'))
NHS="https://www.nhs.uk/tests-and-treatments/"
add={
'echocardiogram-types-and-what-it-shows':[
 (None,"What happens in a standard scan?",[
  ("For a standard echocardiogram no preparation is needed, and NHS trust leaflets say people can eat and drink as normal before and afterwards.",["https://www.uhsussex.nhs.uk/resources/having-an-echocardiogram/"]),
  ("The person lies on their left side while a cardiac physiologist, a specially trained technician, scans the chest after putting gel on it.",["https://www.uhsussex.nhs.uk/resources/having-an-echocardiogram/"]),
  ("The physiologist may ask the person to change position or to hold their breath briefly so that the pictures are clearer.",["https://www.uhsussex.nhs.uk/resources/having-an-echocardiogram/"]),
  ("Trust leaflets describe a standard echocardiogram as having no meaningful risks.",["https://www.uhsussex.nhs.uk/resources/having-an-echocardiogram/"])]),
 (None,"What is a stress echocardiogram like?",[
  ("A stress echocardiogram checks how the heart copes with a greater workload, by taking pictures at rest and again under stress.",["https://www.swbh.nhs.uk/wp-content/uploads/2024/01/Stress-Echocardiogram-Test-ML6070.pdf","https://www.uhs.nhs.uk/Media/UHS-website-2019/Patientinformation/Heartandlungs/Stress-echocardiogram-636-PIL.pdf"]),
  ("The stress comes from a treadmill or exercise bike or, for people who cannot exercise, from a medicine given into a vein.",["https://www.swbh.nhs.uk/wp-content/uploads/2024/01/Stress-Echocardiogram-Test-ML6070.pdf","https://www.uhs.nhs.uk/Media/UHS-website-2019/Patientinformation/Heartandlungs/Stress-echocardiogram-636-PIL.pdf"]),
  ("A cardiologist or a specially trained cardiac physiologist supervises the test.",["https://www.swbh.nhs.uk/wp-content/uploads/2024/01/Stress-Echocardiogram-Test-ML6070.pdf"]),
  ("Trusts ask people to stop certain heart medicines beforehand, because they can stop the stress medicine from making the heart work harder, and each hospital gives its own instructions.",["https://www.swbh.nhs.uk/wp-content/uploads/2024/01/Stress-Echocardiogram-Test-ML6070.pdf","https://www.uhs.nhs.uk/Media/UHS-website-2019/Patientinformation/Heartandlungs/Stress-echocardiogram-636-PIL.pdf"]),
  ("Leaflets describe the stress test as very safe, and they quote different figures for rare complications such as abnormal heart rhythms or allergic reactions.",["https://www.swbh.nhs.uk/wp-content/uploads/2024/01/Stress-Echocardiogram-Test-ML6070.pdf","https://www.uhs.nhs.uk/Media/UHS-website-2019/Patientinformation/Heartandlungs/Stress-echocardiogram-636-PIL.pdf"])]),
 (None,"How are the results given?",[
  ("A cardiac physiologist analyses the recorded images and writes a report for the doctor who requested the test.",["https://www.uhsussex.nhs.uk/resources/having-an-echocardiogram/","https://www.swbh.nhs.uk/wp-content/uploads/2024/01/Stress-Echocardiogram-Test-ML6070.pdf"]),
  ("That doctor then discusses the results at a clinic appointment, by phone or by letter.",["https://www.uhsussex.nhs.uk/resources/having-an-echocardiogram/"]),
  ("For stress echocardiograms results usually take longer, and one leaflet says this may take two to four weeks.",["https://www.uhs.nhs.uk/Media/UHS-website-2019/Patientinformation/Heartandlungs/Stress-echocardiogram-636-PIL.pdf"])]),
],
'spirometry-lung-function-test-explained':[
 ("What happens during the test?","Why is spirometry done?",[
  ("The NHS says spirometry measures how much air a person can breathe out in one breath, and it is also called a lung function test.",[NHS+"spirometry/"]),
  ("It is used to find out whether symptoms come from a lung condition such as asthma, COPD or pulmonary fibrosis (scarring of the lungs), to monitor an existing condition, or to check fitness before surgery.",[NHS+"spirometry/"]),
  ("NHS England guidance says NICE recommends quality-assured spirometry as one of several objective tests for diagnosing asthma and COPD.",["https://www.england.nhs.uk/wp-content/uploads/2020/03/spirometry-commissioning-guidance.pdf"]),
  ("The same guidance says normal spirometry does not rule out asthma, and that the results are read alongside the person's history.",["https://www.england.nhs.uk/wp-content/uploads/2020/03/spirometry-commissioning-guidance.pdf"])]),
 ("How do people prepare?","How is the test done, according to the NHS?",[
  ("The NHS says staff record the person's height and weight, because they are needed for the calculations.",[NHS+"spirometry/"]),
  ("The person sits beside the machine with a nose clip, breathes in deeply, seals their lips around the tube and breathes out as hard and fast as possible.",[NHS+"spirometry/"]),
  ("The NHS says this is repeated two more times, and that staff may ask the person to use an inhaler and repeat the test.",[NHS+"spirometry/"]),
  ("The NHS says the appointment should take no more than an hour, and that dizziness during or just after the test is possible but should be brief.",[NHS+"spirometry/"]),
  ("The NHS says the test should not be done during a chest infection or soon after a heart attack or stroke.",[NHS+"spirometry/"]),
  ("The NHS says results should arrive within a few weeks, and that a doctor explains what they mean if there is a problem.",[NHS+"spirometry/"])]),
],
'dxa-bone-density-scan-explained':[
 ("Who is offered one?","Why might a doctor suggest it?",[
  ("A bone density scan measures bone density and helps to judge the risk of a fracture.",[NHS+"dexa-scan/why-its-done/"]),
  ("Unlike an ordinary X-ray, it can detect small reductions in bone density, so osteoporosis can be found before a bone breaks.",[NHS+"dexa-scan/why-its-done/"]),
  ("The NHS lists reasons for a scan that include a broken bone after a minor fall or injury, long-term use of steroid tablets, and early menopause.",[NHS+"dexa-scan/why-its-done/"])]),
 ("How much radiation is involved?","Who should not have one?",[
  ("The NHS describes the scan as very safe.",[NHS+"dexa-scan/"]),
  ("Pregnancy is the main caution: the NHS says bone density scans and X-rays are not recommended in pregnancy.",[NHS+"dexa-scan/what-happens/"]),
  ("The person lies on an open table and does not pass through a tunnel or enclosed space.",["https://www.uhleicester.nhs.uk/services/imaging-service/dual-energy-x-ray-absorptiometry-dxa/"]),
  ("An NHS trust page says no special preparation is needed, although metal fasteners on clothing may need to be removed.",["https://www.leedsth.nhs.uk/services/radiology/bone-density-scan-dexa/"])]),
 (None,"When do the results arrive?",[
  ("A trust leaflet says the report typically reaches the doctor within two to three weeks.",["https://www.uhleicester.nhs.uk/services/imaging-service/dual-energy-x-ray-absorptiometry-dxa/"]),
  ("A scan result does not necessarily predict whether a person will break a bone.",["https://www.uhleicester.nhs.uk/services/imaging-service/dual-energy-x-ray-absorptiometry-dxa/"])]),
],
'breast-screening-mammogram-what-to-expect':[
 ("What are the harms and limits?","How is it presented as a choice?",[
  ("The NHS leaflet 'Helping you decide' describes breast screening as a personal choice and sets out its benefits and risks.",["https://phescreening.blog.gov.uk/wp-content/uploads/sites/152/2021/02/BSP01-plain-text-A4-PDF-Feb-2021.pdf","https://www.mcht.nhs.uk/our-services/breast-screening-1"]),
  ("It says screening does not prevent breast cancer from developing.",["https://phescreening.blog.gov.uk/wp-content/uploads/sites/152/2021/02/BSP01-plain-text-A4-PDF-Feb-2021.pdf"]),
  ("Overdiagnosis means finding a cancer that would never have caused harm, and estimates of how often it happens vary between studies.",["https://www.mcht.nhs.uk/our-services/breast-screening-1"]),
  ("A 2012 independent review, cited by an NHS trust, estimated that among 10,000 UK women screened from age 50 for 20 years, about 43 breast cancer deaths would be prevented and 129 cancers would be overdiagnosed.",["https://www.mcht.nhs.uk/our-services/breast-screening-1","https://www.gov.uk/government/publications/breast-screening-helping-women-decide/nhs-breast-screening-helping-you-decide"])]),
],
'cervical-screening-what-to-expect':[
 ("Who is invited and how often?","What is cervical screening for?",[
  ("The NHS describes cervical screening as a test of the health of the cervix that helps to prevent cervical cancer, rather than a test for cancer.",[NHS+"cervical-screening/what-is-cervical-screening/"]),
  ("The NHS says screening is still important for people who have had the HPV vaccine.",[NHS+"cervical-screening/what-is-cervical-screening/"]),
  ("Booking is usually through the GP surgery, online or in the NHS App, and some sexual health clinics also offer it.",[NHS+"cervical-screening/"])]),
 ("What happens at the appointment?","How can the appointment be made easier?",[
  ("The NHS suggests wearing something that can stay on during the test, such as a skirt or long top, and bringing someone for support.",[NHS+"cervical-screening/what-is-cervical-screening/"]),
  ("The NHS says some people find the test uncomfortable or painful, and that the person can ask to stop at any point.",[NHS+"cervical-screening/what-is-cervical-screening/"])]),
],
}
for slug,items in add.items():
    p=F[slug]; led=L(slug)
    for after,head,sents in items:
        text=" ".join(s for s,_ in sents)
        sec={"heading":head,"body":text}
        idx=len(p["body"])
        if after:
            idx=next(i for i,b in enumerate(p["body"]) if b["heading"]==after)+1
        p["body"].insert(idx,sec)
        for s,u in sents: led["ledger"].append(dict(where=f"body[{idx}]",sentence=s,basis="excerpt",urls=u,note="Added after second pass; retrieved in the deepening search (round 2); needs independent check",new=True))
    json.dump(led,open(f'../ledgers/{slug}.ledger.json','w'),indent=1)
    print(slug,sum(len(b['body'].split()) for b in p['body']))
json.dump({"blog":F},open('../fragment.json','w'),indent=1)
