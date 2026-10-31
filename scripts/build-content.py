"""Rebuild the app data from the project's preserved editorial notes."""
from pathlib import Path
import re, json
root=Path(__file__).resolve().parents[1]
p=(root/'docs/arbetsanteckningar.md').read_text()
cards=[]
def clean(s):
 return re.sub(r'\*\*([^*]+)\*\*',r'\1',s).strip()
def add(id,title,phrase,explanation,deck='hypnos',status='Arbetsförslag'):
 cards.append(dict(id=id,title=clean(title),phrase=phrase.strip(),explanation=explanation.strip(),deck=deck,status=status))
# The first discussion block keeps each chosen nuance.
base=[('Avlasta kraven','Du behöver inte [göra / prestera / vara] något särskilt just nu.','Tre varianter som avlastar olika krav. Behåll ”något särskilt” i alla tre. ”Vara något särskilt” har annan innebörd än ”vara på något särskilt sätt”.'),('Din egen takt','Du kan ta det i din egen takt.','”Egen” sätter fokus på det egna valet av takt.'),('Inte veta i förväg','Du behöver inte veta i förväg hur det ska kännas.','Avlastar kravet att förutsäga upplevelsen.'),('Låta det vara','Du kan låta det vara en stund.','Öppet för att lämna något ifred eller tillfälligt avstå från att förändra det.'),('Inget behöver bli klart','Ingenting behöver bli färdigt just nu.','Avlastar resultatkravet under en avgränsad tid.'),('Tankar som passerar','Du behöver inte hålla kvar varje tanke som dyker upp.','Ger möjlighet att inte hålla fast vid varje tanke.'),('Skulle kunna','Du skulle kunna börja med något litet.','”Skulle kunna” betonar en tänkbar väg och eget val.'),('Märka förändringen','Du kanske märker att något blivit lättare.','”Kanske” lämnar märkandet öppet. ”Att något blivit lättare” bäddar in förändringen som ett förutsättande.'),('Få klarna','Allt får klarna i sin egen takt.','Tillåtelse och ett eget förlopp, utan krav på klarhet nu.'),('Betoning öppnar betydelsen','Du behöver inte ändra allt nu.','Pröva att betona ”behöver”, ”allt” och ”nu”. Lyssna efter hur det underförstådda ändras.')]
for i,(t,f,e) in enumerate(base,1): add(f'B{i}',t,f,e,'bas','Bearbetad' if i in [1,2,5,7,8,9] else 'Arbetsförslag')
# M1–M40 are headings, followed by phrase and commentary.
for m in re.finditer(r'^### (MB1-0?(\d+)|M(\d+)) – (.*?)\n(.*?)(?=\n### |\n## |\Z)',p,re.M|re.S):
 number=int(m.group(2) or m.group(3))
 if number==10: continue
 title=re.sub(r'\s*\(M-.*?\)','',m.group(4))
 body=m.group(5).strip().split('\n\n')
 phrase=body[0]
 explanation=body[1] if len(body)>1 else ''
 if number==1:
  phrase='Jag kommer inte säga åt dig ”**välj en ny väg**”, det får du komma fram till själv.'
  explanation='En negerad ram uttalar ändå uppmaningen. Markera ”välj en ny väg” med vokal emfas. Avslutningen lämnar avgörandet till lyssnaren men antyder också en riktning.'
 add(f'M{number}',title,phrase,explanation,status='Bearbetad' if number<21 else 'Arbetsförslag')
# M41–M50 are one-line bullets.
for m in re.finditer(r'^- \*\*M(4\d|50), (.*?):\*\* (.*)$',p,re.M):
 n=int(m.group(1))
 if n==43: continue
 explanations={41:'Prövar ordningen mellan beredskap och handling.',42:'Placerar lärandet före slutsatsen om förmågan.',44:'Uppmaningen sägs i en ram som förnekar att den ska ges.',45:'Kopplar fler möjliga försök till minskad betydelse av ett enda utfall.',46:'Samma faktum kan betyda brist på erfarenhet och möjlighet till en början.',47:'Gör en bildlig inre konflikt till ett utbyte av information.',48:'Ett konkret ordbyte flyttar perspektivet från slutgiltigt utfall till fortsatt möjlighet.',49:'Skiljer en spontan tanke från ett slutgiltigt avgörande.',50:'Båda alternativen gör försöket till användbar information.'}
 add(f'M{n}',m.group(2),m.group(3),explanations.get(n,''))
# Metamodel cards: prompt first, a small cue below, possible response on back.
for line in p.splitlines():
 if not line.startswith('| N'): continue
 cells=[x.strip() for x in line.strip('|').split('|')]
 id=cells[0]
 if len(cells)==4:
  _,phrase,answer,explanation=cells
 else:
  _,phrase,explanation=cells; answer=''
 if id=='N9':
  explanation='Undersök hur ett intryck blir till en reaktion.'
  answer='Hur går det till inom dig, från att du hör hans tonfall tills du känner att du måste försvara dig?'
 add(id,'Upptäck språkgreppet',phrase,explanation,'nlp','Bearbetad')
 cards[-1]['example']=answer
# Last eight proposals use table rows.
for line in p.splitlines():
 if not re.match(r'\| M5[1-8] \|',line): continue
 _,id,source,phrase,explanation,_=line.split('|')
 titles={'M51':'Hur vet du?','M52':'Och du kan, [namn] …','M53':'Veta och lära','M54':'Kanske …','M55':'Just så. Precis så.','M56':'Nu när … blir det lättare …','M57':'Ta upptäckten vidare','M58':'Så småningom …'}
 id=id.strip(); explanation=explanation.strip()
 if id=='M55': explanation='Bekräfta utan att precisera exakt vad klienten gör rätt. Lyssnaren kan själv koppla bekräftelsen till sin upplevelse.'
 if id=='M56': explanation='Rama in X som redan aktuellt och koppla det till att Y blir lättare. Exempel: Nu när du har hittat ett undantag blir det lättare att börja leta efter fler.'
 add(id,titles[id],phrase.strip(),explanation,status='Bearbetad' if id in ['M55','M56'] else 'Arbetsförslag')
assert len(cards)==len({x['id'] for x in cards})
# Exercise banks: users create the language, rather than being shown a solution.
commands=['Välj en ny väg','Ge dig själv en chans','Upptäck något nytt','Lita på det du kan','Ta nästa steg','Pröva en annan möjlighet','Lyssna på dig själv','Släpp ett gammalt krav','Börja med det du vet','Ge dig själv mer tid','Låt det bli enklare','Hitta ditt eget sätt']
goals=['börja lära sig något nytt','välja ett första litet steg','utforska en ny idé','ta en paus','pröva ett annat arbetssätt','upptäcka egna styrkor','förbereda ett samtal','undersöka ett beslut']
statements=['Jag ändrar mig hela tiden.','Jag tänker för mycket.','Jag är för försiktig.','Jag blir lätt otålig.','Jag frågar alltid en gång till.','Jag behöver tid innan jag bestämmer mig.','Jag märker alla småfel.','Jag har svårt att släppa en idé.','Jag är envis.','Jag har inte lyckats ännu.']
concrete=['Minns promenaden vid havet när du blev lugn.','Titta på den blå stolen vid fönstret.','Tänk på när du lärde dig cykla.','Du bestämde dig för att ringa din vän i går.','Du kände värmen i händerna efter promenaden.','Du skrev de tre första raderna i anteckningsboken.']
contexts=['inleda en frivillig gemensam övning','hjälpa någon att orientera sig i ett nytt rum','förbereda en enkel kreativ uppgift','börja ett samtal om lärande','introducera ett kortspel','inleda en planeringsstund']
words=['nyckel','horisont','förändring','stig','fönster','nyfikenhet','rytm','möjlighet','tråd','upptäckt','bro','riktning','vatten','förståelse','dörr','rörelse','ljus','erfarenhet']
exercises=[
 dict(id='mus',title='MUS',subtitle='Mening utan slut',icon='↝',tag='FLÖDE',description='Håll en enda mening levande med öppna ord och ständigt nya länkningar.',instruction='Tala i en enda lång mening. Använd nominaliseringar och ospecificerade verb. Bind vidare utan att avsluta och låt lyssnaren fylla innehållet med egna erfarenheter.',support='… och medan … samtidigt som … vilket … i takt med att … så att …',reflection=['Var blev du för specifik?','Var avslutade du kedjan?','Var bröts länkningen?'],bank=['förändring · upptäcka · förståelse · märka','nyfikenhet · uppleva · utveckling · lära','möjlighet · förändra · erfarenhet · upptäcka'],audio=True,star=True),
 dict(id='yes',title='Yes-set',subtitle='Tre frågor, tre ja',icon='＋',tag='SEKVENS',description='Skapa tre naturliga frågor som inbjuder till samma svar: ja.',instruction='Formulera tre frågor som inbjuder till ja. Låt dem bilda en naturlig sekvens i det givna sammanhanget.',reflection=['Inbjuder alla tre till ja?','Hänger frågorna ihop utan att kännas krystade?'],bank=contexts,audio=True),
 dict(id='no',title='No-set',subtitle='Tre frågor, tre nej',icon='−',tag='SEKVENS',description='Bygg en följd av tre frågor som inbjuder till nej.',instruction='Formulera tre frågor som inbjuder till nej. Behåll en naturlig samtalston och utgå från sammanhanget.',reflection=['Inbjuder alla tre till nej?','Är frågorna begripliga utan staplade negationer?'],bank=contexts,audio=True),
 dict(id='compliance',title='Compliance-set',subtitle='Tre uppmaningar i följd',icon='→',tag='SEKVENS',description='Skapa tre enkla uppmaningar som inbjuder till handling.',instruction='Formulera tre enkla uppmaningar i en naturlig följd. Handlingarna behöver inte vara identiska. Utgå från det givna sammanhanget.',reflection=['Är varje uppmaning tydlig och lätt att följa?','Bildar handlingarna en naturlig sekvens?'],bank=contexts,audio=True),
 dict(id='embedded',title='Bädda in en uppmaning',subtitle='Bygg ramen själv',icon='⌁',tag='INBÄDDNING',description='Få en slumpad uppmaning. Skapa inbakningen och markera kommandot med rösten.',instruction='Bygg en naturlig formulering runt uppmaningen. Säg den högt och markera de inbäddade orden med betoning, tempo eller paus. Bedöm ditt eget framförande.',reflection=['Lät hela meningen naturlig?','Hördes kommandot som du avsåg?'],bank=commands,audio=True,selfOnly=True),
 dict(id='alternativ',title='Alla vägar leder vidare',subtitle='Flera val, en riktning',icon='⑂',tag='ALTERNATIV',description='Ge två eller tre val som alla leder mot samma mål.',instruction='Skapa två eller tre alternativ som alla leder mot det givna målet. Låt lyssnaren välja väg.',reflection=['Leder alla alternativen mot målet?','Låter valet naturligt?'],bank=goals,audio=True),
 dict(id='omramning',title='Samma innehåll, ny betydelse',subtitle='Tre nya perspektiv',icon='◇',tag='OMRAMNING',description='Hitta tre möjliga omramningar utan att förneka det som beskrivs.',instruction='Ge påståendet tre alternativa betydelser. Behåll beteendet eller erfarenheten men undersök andra sätt att förstå den.',reflection=['Bevarade du det som faktiskt beskrevs?','Tillförde du tre olika perspektiv?'],bank=statements,audio=True),
 dict(id='precision',title='Konkret–öppet–konkret',subtitle='Växla tolkningsutrymme',icon='↔',tag='PRECISION',description='Gör en konkret mening öppen och låt den sedan bli konkret igen.',instruction='Gör den givna meningen öppnare med nominaliseringar och ospecificerade verb. Gör den sedan konkret igen, gärna med ett nytt innehåll.',reflection=['Vilka detaljer tog du bort?','Kan den öppna versionen rymma flera erfarenheter?'],bank=concrete,audio=True),
 dict(id='vav',title='Fånga och väv vidare',subtitle='Ett nytt ord i taget',icon='∿',tag='IMPROVISATION',description='Fortsätt tala när nya ord dyker upp. Väv in dem utan att börja om.',instruction='Börja tala med det första ordet. Ett nytt ord kommer var tionde sekund. Väv in varje ord i det du redan säger utan att börja om.',reflection=['Lyckades du fortsätta utan att börja om?','Hur byggde du övergångarna?'],bank=words,audio=True),
 dict(id='berattelse',title='Berättelsen bär uppmaningen',subtitle='En röst inuti en berättelse',icon='“',tag='BERÄTTANDE',description='Bädda in en uppmaning i en kort, påhittad berättelse.',instruction='Skapa en kort, tydligt påhittad berättelse där en person säger uppmaningen till en annan. Gör citatet naturligt i berättelsen och markera det med rösten.',reflection=['Hade uppmaningen en naturlig plats?','Var det tydligt att berättelsen var påhittad?'],bank=commands,audio=True),
 dict(id='metamodell',title='Upptäck språkgreppet',subtitle='Svara på ett påstående',icon='?',tag='NLP',description='Hitta generaliseringar, antaganden och inre processer. Formulera en egen fråga.',instruction='Lyssna efter generaliseringar, utelämnad information eller antaganden. Svara med en fråga som undersöker påståendet. Det finns inget enda rätt svar.',reflection=['Vad i språket fångade du upp?','Undersöker din fråga utan att bestämma svaret?'],bank=[c['phrase'] for c in cards if c['deck']=='nlp'],audio=True)
]
(root/'data.json').write_text(json.dumps(dict(cards=cards,exercises=exercises,version=1),ensure_ascii=False,indent=2)+'\n')
print(f'{len(cards)} kort, {len(exercises)} övningar')
