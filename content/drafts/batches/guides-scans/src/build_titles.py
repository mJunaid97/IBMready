import re
from common import U
T={"nhs.uk":"NHS","gov.uk":"GOV.UK","medlineplus.gov":"MedlinePlus","nibib.nih.gov":"NIBIB","cancerresearchuk.org":"Cancer Research UK","bhf.org.uk":"British Heart Foundation","theros.org.uk":"Royal Osteoporosis Society","111.wales.nhs.uk":"NHS 111 Wales","ncbi.nlm.nih.gov":"PubMed Central","nhsinform.scot":"NHS inform","macmillan.org.uk":"Macmillan Cancer Support","assets.publishing.service.gov.uk":"GOV.UK"}
TR={"kch":"King's College Hospital","chelwest":"Chelsea and Westminster","gloshospitals":"Gloucestershire Hospitals","yorkhospitals":"York and Scarborough","nbt":"North Bristol","uhs":"University Hospital Southampton","royalmarsden":"Royal Marsden","hampshirehospitals":"Hampshire Hospitals","barnsleyhospital":"Barnsley Hospital","lancsteachinghospitals":"Lancashire Teaching Hospitals","whittington":"Whittington Health","leedsth":"Leeds Teaching Hospitals","pah":"Princess Alexandra Hospital","leicestershospitals":"Leicester's Hospitals","nth":"North Tees and Hartlepool","ncic":"North Cumbria","uhb":"University Hospitals Birmingham","royaldevon":"Royal Devon","merseycare":"Mersey Care","uhsussex":"University Hospitals Sussex","swbh":"Sandwell and West Birmingham","hey":"Hull University Teaching Hospitals","royalfree":"Royal Free London","cht":"Calderdale and Huddersfield","southtees":"South Tees","uhmb":"Morecambe Bay","uclh":"University College London Hospitals","kingstonandrichmond":"Kingston and Richmond","forumhealthcentre":"Forum Health Centre","england":"NHS England"}
def title(k):
    u=U[k]; host=re.sub(r"^https://(www\.)?","",u).split("/")[0]
    if host in T:
        pub=T[host]
        if k.startswith("nhs_"): pub="NHS"
    elif host.endswith(".nhs.uk"): pub=TR.get(host[:-7].split(".")[-1],host)+" (NHS trust page)"
    else: pub=host
    return f"{pub}: {k.split('_',1)[1].replace('_',' ') if '_' in k else k}"
