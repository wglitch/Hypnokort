'use strict';
const $ = (q, el = document) => el.querySelector(q);
const $$ = (q, el = document) => [...el.querySelectorAll(q)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const plain = s => String(s).replace(/\*\*/g, '');
const pick = (a, avoid) => { const options = a.filter(x => x !== avoid); return options[Math.floor(Math.random() * options.length)] ?? a[0]; };
const time = n => `${Math.floor(Math.max(0,n)/60)}:${String(Math.max(0,n)%60).padStart(2,'0')}`;
let storageOK = true;
function read(key, fallback) { try { const value = localStorage.getItem('hypnokort.' + key); return value ? JSON.parse(value) : fallback; } catch { storageOK = false; return fallback; } }
function save(key, value) { try { localStorage.setItem('hypnokort.' + key, JSON.stringify(value)); } catch { storageOK = false; toast('Webbläsaren kunde inte spara. Behåll anteckningen genom att kopiera den.'); } }
const listValue = v => Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
const state = {cards:[],exercises:[],deck:'alla',query:'',favoritesOnly:false,index:0,back:false,indexOpen:false,favs:new Set(listValue(read('favorites',[]))),seen:new Set(listValue(read('seen',[]))),exercise:null,prompt:'',mode:'self',duration:Number(read('duration',60))||60,seconds:60,running:false,started:false,paused:false,deadline:0,timer:null,words:[],wordStep:0};
const audio = {active:false,paused:false,phase:'idle',round:0,total:3,seconds:60,deadline:0,timer:null,ex:null,prompt:'',generation:0,remaining:0,selection:new Set(listValue(read('audioSelection',['mus','omramning','alternativ','embedded','berattelse']))),wordStep:0,words:[],duration:60};
let toastTimeout, speechGeneration = 0;
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('visible'); clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>el.classList.remove('visible'),3200); }
function intro(eyebrow,title,description,stat='') { return `<section class="intro"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p>${stat ? `<div class="stats">${stat}</div>` : ''}</section>`; }
function supportsSpeech() { return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window; }
function stopSpeech() { speechGeneration++; if(supportsSpeech()) speechSynthesis.cancel(); }
function speak(text, done=()=>{}) {
  stopSpeech();
  if(!supportsSpeech()) { toast('Uppläsning stöds inte i den här webbläsaren.'); done(false); return; }
  const gen=speechGeneration;
  const utterance=new SpeechSynthesisUtterance(plain(text));
  utterance.lang='sv-SE'; utterance.rate=.92;
  const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('sv'));
  if(voice) utterance.voice=voice;
  let finished=false;
  const finish=success=>{ if(finished||gen!==speechGeneration)return; finished=true; done(success); };
  utterance.onend=()=>finish(true);
  utterance.onerror=e=>{if(e.error!=='canceled'&&e.error!=='interrupted'){toast('Uppläsningen kunde inte starta. Prova igen eller välj en svensk röst på enheten.');finish(false);}};
  speechSynthesis.speak(utterance);
}
function filtered() { const q=state.query.toLocaleLowerCase('sv'); return state.cards.filter(c=>(state.deck==='alla'||c.deck===state.deck)&&(!state.favoritesOnly||state.favs.has(c.id))&&(!q||`${c.title} ${plain(c.phrase)} ${c.explanation} ${c.id}`.toLocaleLowerCase('sv').includes(q))); }
function geometry(deck) {
 if(deck==='nlp')return '<div class="card-pattern circles" aria-hidden="true"></div>';
 const shapes=Array.from({length:19},(_,i)=>{const size=70+i*70;return `<rect x="${500-size/2}" y="${500-size/2}" width="${size}" height="${size}" rx="1"/>`;}).join('');
 return `<div class="card-pattern ${deck==='bas'?'diamonds':'squares'}" aria-hidden="true"><svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.1">${shapes}</g></svg></div>`;
}
function cardView() {
 const all=filtered(); state.index=Math.min(state.index,Math.max(0,all.length-1)); const card=all[state.index];
 if(!card)return '<div class="empty"><h2>Inga kort i det här urvalet.</h2><button class="btn secondary" data-action="reset-filters">Visa alla kort</button></div>';
 if(!state.seen.has(card.id)){state.seen.add(card.id);save('seen',[...state.seen]);}
 const favorite=state.favs.has(card.id);
 const back=state.back?`<div class="detail"><div class="label">${card.deck==='nlp'?'Möjlig ingång':'Språkgreppet'}</div><p>${esc(card.deck==='nlp'?(card.example||'Pröva en egen fråga. Det finns flera möjliga svar.'):card.explanation)}</p>${card.deck==='nlp'&&card.id==='N9'?'<p>Undersök den inre processen, utan att bestämma mellanleden i förväg.</p>':''}<span class="draft">${esc(card.status)}</span></div>`:'';
 return `<article class="language-card deck-${card.deck}" aria-label="${esc(card.id+' '+card.title)}">${geometry(card.deck)}<div class="card-head"><span class="label">${esc(card.title)}</span><button class="card-fav ${favorite?'active':''}" data-action="favorite" aria-label="${favorite?'Ta bort favorit':'Spara favorit'}" aria-pressed="${favorite}">${favorite?'★':'☆'}</button></div><div class="card-reading"><h1 class="quote">${card.deck==='nlp'?'<span class="prompt-label">Svara på:</span>':''}${rich(card.phrase)}</h1>${card.deck==='nlp'?`<p class="nlp-cue">${esc(card.explanation)}</p>`:''}${back}<div class="card-foot"><button data-action="flip" aria-expanded="${state.back}">${state.back?'Dölj':card.deck==='nlp'?'Möjlig ingång':'Språkgreppet'} <span aria-hidden="true">${state.back?'−':'＋'}</span></button><span class="id">${esc(card.id)}</span></div></div><div class="card-controls"><button class="icon-btn" data-action="prev" aria-label="Föregående kort" ${state.index===0?'disabled':''}>←</button><button class="icon-btn shuffle" data-action="shuffle" aria-label="Slumpa ett kort">⤨</button><button class="icon-btn" data-action="next" aria-label="Nästa kort" ${state.index===all.length-1?'disabled':''}>→</button><span class="counter" aria-live="polite">${state.index+1} / ${all.length}</span></div></article>`;
}
let patternObserver;
function alignPattern(){
 const card=$('.language-card');const label=$('.prompt-label',card||document);
 if(card&&label){const c=card.getBoundingClientRect(),l=label.getBoundingClientRect();card.style.setProperty('--pattern-x',`${l.left+l.width/2-c.left}px`);card.style.setProperty('--pattern-y',`${l.top+l.height/2-c.top}px`);}
}
function watchPattern(){patternObserver?.disconnect();requestAnimationFrame(alignPattern);if('ResizeObserver' in window&&$('.language-card')){patternObserver=new ResizeObserver(alignPattern);patternObserver.observe($('.language-card'));if($('.card-reading'))patternObserver.observe($('.card-reading'));}}
window.addEventListener('resize',alignPattern);
if(document.fonts)document.fonts.ready.then(alignPattern);
function renderCards(){document.body.classList.add('card-mode');$('#main').innerHTML='<section id="card-area" aria-label="Aktuellt kort">'+cardView()+'</section>';watchPattern();}
function indexView(){const all=filtered();return `<div class="card-index">${all.map((c,i)=>`<button class="index-item ${i===state.index?'current':''}" data-index="${i}"><span>${esc(c.id)}</span>${esc(c.title)}</button>`).join('')}</div>`;}
function renderLibrary(){
 $('#library-content').innerHTML=`<section class="library-filters"><div class="segmented" role="group" aria-label="Välj kortlek">${[['alla','Alla'],['hypnos','Hypnos'],['nlp','NLP'],['bas','Nyanser']].map(([id,label])=>`<button data-deck="${id}" class="${state.deck===id?'selected':''}" aria-pressed="${state.deck===id}">${label}</button>`).join('')}</div><div class="library-search"><label class="search"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Sök kort …" aria-label="Sök bland korten" value="${esc(state.query)}"></label><button class="icon-btn ${state.favoritesOnly?'active':''}" data-action="filter-favorites" aria-label="Visa bara favoriter" aria-pressed="${state.favoritesOnly}">☆</button></div><button class="btn primary library-resume" data-action="resume-cards">Till kortleken →</button><div class="library-count"><span id="match-count">${filtered().length} kort</span><span>${state.favs.size} favoriter</span></div><div id="card-index">${indexView()}</div></section>`;
}
function refreshCard(){if($('#card-area')){$('#card-area').innerHTML=cardView();watchPattern();}if($('#match-count'))$('#match-count').textContent=`${filtered().length} kort`;if($('#card-index'))$('#card-index').innerHTML=indexView();}
function closeLibrary(){$('#library-dialog').close();}
function showCards(){closeLibrary();if(location.hash!=='#kort')location.hash='kort';else renderCards();}
function renderExercises(){ $('#main').innerHTML=intro('','Övningar','')+`<div class="exercise-grid">${state.exercises.map(ex=>`<a class="exercise-tile" href="#ovning/${ex.id}"><div class="tile-top"><span class="tile-icon" aria-hidden="true">${ex.icon}</span><span class="tile-tag">${ex.star?'★ FAVORITIDÉ':ex.tag}</span></div><h2>${esc(ex.title)}</h2><span class="tile-bottom">${esc(ex.subtitle)} <span aria-hidden="true">↗</span></span></a>`).join('')}</div>`; }
function promptLabel(ex){return ['embedded','berattelse'].includes(ex.id)?'Din uppmaning':ex.id==='alternativ'?'Ditt mål':ex.id==='metamodell'?'Svara på':ex.id==='vav'?'Väv in ordet':ex.id==='mus'?'Öppna byggstenar':['yes','no','compliance'].includes(ex.id)?'Ditt sammanhang':'Din utgångspunkt';}
function renderExercise(id){
 const ex=state.exercises.find(e=>e.id===id);if(!ex){location.hash='ovningar';return;}
 state.exercise=ex;state.prompt=pick(ex.bank);state.mode='self';state.seconds=state.duration;state.words=[state.prompt];state.wordStep=0;
 $('#main').innerHTML=`<a class="back" href="#ovningar">← Alla övningar</a>`+intro(ex.tag,esc(ex.title),esc(ex.instruction))+`<div class="exercise-layout"><section><div class="panel"><div class="label" id="prompt-label">${promptLabel(ex)}</div><div class="exercise-prompt" id="exercise-prompt">${esc(state.prompt)}</div><div class="word-history" id="word-history"></div><button class="btn secondary" data-action="new-prompt">⤨ ${ex.id==='embedded'||ex.id==='berattelse'?'Ny uppmaning':'Ny uppgift'}</button>${ex.support?`<div class="support">${esc(ex.support)}</div>`:''}<hr class="divider"><div class="row"><label class="field">Övningstid<select id="duration">${[30,45,60,90,120].map(n=>`<option value="${n}" ${state.duration===n?'selected':''}>${n} sekunder</option>`).join('')}</select></label><button class="btn secondary" data-action="read-prompt" ${supportsSpeech()?'':'disabled'}>♫ Läs upp uppgiften</button></div><div class="timer" id="timer" role="timer" aria-label="Återstående övningstid">${time(state.seconds)}</div><div class="timer-label" id="timer-label">${ex.id==='vav'?'Ett nytt ord var tionde sekund.':''}</div><div class="row" style="justify-content:center"><button class="btn primary" id="timer-start" data-action="timer">Starta övningen</button><button class="btn secondary" data-action="reset-timer">Återställ</button></div></div>${!ex.selfOnly?`<section class="notes"><div class="segmented mode-tabs" role="group" aria-label="Övningsläge"><button data-mode="self" class="selected" aria-pressed="true">Prata fritt på egen hand</button><button data-mode="notes" aria-pressed="false">Skriv / diktera</button></div><div id="notes-body"></div></section>`:''}</section><aside><details class="panel reflection-panel"><summary>Efteråt</summary><ul class="reflections">${ex.reflection.map(q=>`<li>${esc(q)}</li>`).join('')}</ul><a href="#ljud" class="small-link">Ljudläge →</a></details></aside></div>`;
}
function showNotes(mode){state.mode=mode;$$('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===mode);b.setAttribute('aria-pressed',b.dataset.mode===mode);});$('#notes-body').innerHTML=mode==='notes'?`<label class="field" for="practice-notes">Ditt försök / dina anteckningar</label><textarea id="practice-notes" placeholder="Tryck här och använd mikrofonen på iPhones tangentbord, eller skriv …">${esc(read('note.'+state.exercise.id,''))}</textarea><p class="note-caption" id="save-note">Sparas på den här enheten. Ingen text skickas till en server.</p><button class="btn quiet" data-action="copy-notes">Kopiera texten</button>`:'';}
function stopTimer(){clearInterval(state.timer);state.timer=null;state.running=false;}
function drawTimer(){if(!$('#timer'))return;$('#timer').textContent=time(state.seconds);$('#timer-start').textContent=state.running?'Pausa':state.started?'Fortsätt':'Starta övningen';$('#duration').disabled=state.started;}
function resetTimer(){stopTimer();stopSpeech();state.started=false;state.seconds=state.duration;state.wordStep=0;state.words=[state.prompt];drawTimer();if($('#timer-label'))$('#timer-label').textContent='Redo för ett nytt försök.';}
function toggleTimer(){
 if(state.running){state.seconds=Math.max(0,Math.ceil((state.deadline-Date.now())/1000));stopTimer();drawTimer();$('#timer-label').textContent='Pausad';return;}
 if(state.seconds<=0)state.seconds=state.duration;
 state.started=true;state.running=true;state.deadline=Date.now()+state.seconds*1000;$('#timer-label').textContent='Din tur. Fortsätt i din egen takt.';drawTimer();
 state.timer=setInterval(()=>{state.seconds=Math.max(0,Math.ceil((state.deadline-Date.now())/1000));drawTimer();const elapsed=state.duration-state.seconds;
  if(state.exercise.id==='vav'&&Math.floor(elapsed/10)>state.wordStep&&state.seconds>0){state.wordStep=Math.floor(elapsed/10);state.prompt=pick(state.exercise.bank,state.prompt);state.words.push(state.prompt);$('#exercise-prompt').textContent=state.prompt;$('#word-history').textContent='Tidigare ord: '+state.words.slice(0,-1).join(' · ');}
  if(state.seconds===0){stopTimer();state.started=false;drawTimer();$('#timer-label').textContent='Klart för den här gången. Vad vill du pröva nästa gång?';$('#timer-start').textContent='Öva igen';if(supportsSpeech())speak('Övningstiden är slut.');}
 },200);
}
function renderAudio(){
 const available=state.exercises.filter(ex=>ex.audio);
 $('#main').innerHTML=intro('','Ljudpass','')+`<section class="panel audio-panel"><div class="label">Sätt ihop ditt pass</div><div class="choices">${available.map(ex=>`<button class="choice ${audio.selection.has(ex.id)?'active':''}" data-audio-choice="${ex.id}" aria-pressed="${audio.selection.has(ex.id)}">${esc(ex.title)}</button>`).join('')}</div><div class="row"><label class="field">Tid per uppgift<select id="audio-duration">${[30,45,60,90,120].map(n=>`<option value="${n}" ${n===audio.duration?'selected':''}>${n} sekunder</option>`).join('')}</select></label><label class="field">Antal uppgifter<select id="audio-rounds">${[1,3,5,10].map(n=>`<option value="${n}" ${n===audio.total?'selected':''}>${n}</option>`).join('')}</select></label></div><div class="audio-visual"><span class="audio-orb" id="audio-orb" aria-hidden="true">∿</span></div><div class="audio-status" id="audio-status" role="status">Redo när du är.</div><div class="audio-prompt" id="audio-prompt"></div><div class="timer" id="audio-timer" role="timer">${time(audio.duration)}</div><div class="audio-meta" id="audio-meta">${audio.total} uppgifter · ${audio.duration} sekunder egen övning per uppgift</div><div class="row audio-controls"><button class="btn primary" id="audio-start" data-action="audio-start" ${supportsSpeech()?'':'disabled'}>Starta ljudpass</button><button class="btn secondary" id="audio-skip" data-action="audio-skip" disabled>Nästa uppgift</button><button class="btn secondary" id="audio-stop" data-action="audio-stop" disabled>Avsluta</button></div><hr class="divider"><p class="note-caption">${supportsSpeech()?'Använder enhetens svenska uppläsningsröst om den finns. Ingen inspelning sker. Håll sidan öppen och skärmen vaken; bakgrundsuppspelning varierar mellan webbläsare.':'Din webbläsare stöder inte uppläsning. Övningarna går att använda i textläge.'}</p><p class="note-caption">För promenad eller en stund i stillhet. Gör inte de här koncentrationsövningarna medan du kör.</p></section>`;
}
function updateAudioControls(){
 if(!$('#audio-start'))return;
 $('#audio-start').textContent=!audio.active?'Starta ljudpass':audio.paused?'Fortsätt':'Pausa';
 $('#audio-skip').disabled=!audio.active;$('#audio-stop').disabled=!audio.active;
 $('#audio-duration').disabled=audio.active;$('#audio-rounds').disabled=audio.active;
 $$('[data-audio-choice]').forEach(b=>b.disabled=audio.active);
 $('#audio-orb').classList.toggle('running',audio.active&&!audio.paused);
}
function stopAudio(message='Passet är avslutat.'){audio.generation++;audio.active=false;audio.paused=false;audio.phase='idle';clearInterval(audio.timer);audio.timer=null;stopSpeech();if($('#audio-status')){$('#audio-status').textContent=message;updateAudioControls();}}
function runAudio(){
 if(!audio.selection.size){toast('Välj minst en övning.');return;}
 if(audio.active){
  if(audio.paused){audio.paused=false;if(audio.phase==='speech'){audioInstruction();}else{audio.deadline=Date.now()+audio.remaining*1000;audio.phase==='gap'?startGapClock():startAudioClock();}}
  else{audio.paused=true;if(audio.phase==='speech'){audio.generation++;stopSpeech();}else{audio.remaining=Math.max(0,Math.ceil((audio.deadline-Date.now())/1000));clearInterval(audio.timer);}$('#audio-status').textContent='Pausat';}
  updateAudioControls();return;
 }
 audio.total=Number($('#audio-rounds').value);audio.duration=Number($('#audio-duration').value);audio.round=0;audio.ex=null;audio.active=true;audio.paused=false;nextAudio();
}
function nextAudio(){
 audio.generation++;clearInterval(audio.timer);stopSpeech();audio.paused=false;
 if(audio.round>=audio.total){stopAudio('Passet är klart. Fint övat.');if(supportsSpeech())speak('Passet är klart. Ta med dig något du vill pröva igen.');return;}
 audio.round++;
 const choices=state.exercises.filter(ex=>audio.selection.has(ex.id));audio.ex=pick(choices,audio.ex);audio.prompt=pick(audio.ex.bank);audio.words=[audio.prompt];audio.wordStep=0;
 audioInstruction();
}
function audioInstruction(){
 audio.phase='speech';const gen=++audio.generation;
 $('#audio-status').textContent=`Uppgift ${audio.round} av ${audio.total} · ${audio.ex.title}`;
 $('#audio-prompt').textContent=audio.prompt;$('#audio-timer').textContent=time(audio.duration);$('#audio-meta').textContent=audio.ex.instruction;updateAudioControls();
 const text=`Uppgift ${audio.round}. ${audio.ex.title}. ${audio.ex.instruction} ${promptLabel(audio.ex)}: ${audio.prompt}. Du har ${audio.duration} sekunder. Varsågod.`;
 speak(text,success=>{if(gen!==audio.generation||!audio.active||audio.paused)return;if(!success){stopAudio('Uppläsningen avbröts. Prova att starta igen.');return;}audio.phase='practice';audio.deadline=Date.now()+audio.duration*1000;startAudioClock();});
}
function startAudioClock(){clearInterval(audio.timer);$('#audio-status').textContent=`Din tur · ${audio.ex.title}`;
 audio.timer=setInterval(()=>{
  if(!audio.active||audio.paused)return;
  audio.seconds=Math.max(0,Math.ceil((audio.deadline-Date.now())/1000));$('#audio-timer').textContent=time(audio.seconds);
  if(audio.ex.id==='vav'&&Math.floor((audio.duration-audio.seconds)/10)>audio.wordStep&&audio.seconds>0){audio.wordStep=Math.floor((audio.duration-audio.seconds)/10);audio.prompt=pick(audio.ex.bank,audio.prompt);audio.words.push(audio.prompt);$('#audio-prompt').textContent=audio.prompt;speak(audio.prompt);}
  if(audio.seconds===0){clearInterval(audio.timer);audio.phase='speech';const gen=++audio.generation;speak(`Tiden är slut. ${audio.ex.reflection[0]} Du får en kort paus.`,success=>{if(gen!==audio.generation||!audio.active||audio.paused)return;if(!success){stopAudio('Uppläsningen avbröts.');return;}audio.phase='gap';audio.deadline=Date.now()+7000;startGapClock();});}
 },200);
}
function startGapClock(){clearInterval(audio.timer);$('#audio-status').textContent='Kort paus · känn efter';audio.timer=setInterval(()=>{const remaining=Math.max(0,Math.ceil((audio.deadline-Date.now())/1000));$('#audio-timer').textContent=time(remaining);if(remaining===0){clearInterval(audio.timer);nextAudio();}},200);}
function renderAbout(){ $('#main').innerHTML=intro('OM LABBET','Ett språk. <em>Många vägar.</em>','En första prototyp av en svensk kortlek och övningsbank för hypnos, NLP och retorik.')+`<article class="prose"><span class="badge">Prototyp 1.0</span><h2>Kort som gör något.</h2><p>Här tränar du språkgrepp: förutsättanden, inbäddade uppmaningar, alternativfrågor, omramningar och sätt att undersöka hur vi beskriver våra erfarenheter.</p><p>Hypnoskorten visar fraser och mallar. NLP-korten börjar med ”Svara på:” och tränar dig att upptäcka mönstret och formulera en egen fråga. Det finns flera möjliga svar.</p><h2>En svensk bearbetning</h2><p>Innehållet är egna svenska arbetsformuleringar, framtagna i dialog med utgångspunkt främst i Mike Mandels språkbyggstenar och med Salad och Zebu som jämförelsematerial. Det här är ingen officiell version av deras kortlekar. Formuleringarna är språkexempel, inte löften om en viss effekt. Kort märkta ”Arbetsförslag” är fortfarande under bearbetning.</p><h2>Öva på ditt sätt</h2><p>MUS betyder Mening utan slut, med NUVI (Nominalization Unspecified Verb Induction) som bakgrund. De övriga övningarna låter dig bygga egna sekvenser, omramningar och berättelser. Slumpade uppmaningar lämnas till dig att bädda in.</p><h2>Dina anteckningar stannar här</h2><p>Favoriter, utforskade kort och övningsanteckningar sparas i webbläsaren på den här enheten. De synkas inte mellan enheter. Använd iPhones tangentbordsdiktering i textfälten. Ingen AI-analys eller ljudinspelning ingår i version 1.</p><p>Uppläsning använder webbläsarens och enhetens röster. Svensk röst och funktion med låst skärm beror på enheten. Välj en svensk systemröst om uttalet blir fel.</p><div class="row"><button class="btn secondary" data-action="export">Exportera mina sparade data</button><label class="btn secondary" style="cursor:pointer">Importera sparade data<input id="import-data" type="file" accept="application/json" hidden></label></div><p class="note-caption">Exporten innehåller dina favoriter och anteckningar. Spara filen om du vill flytta dem till en annan enhet.</p><h2>Fortsätt utveckla</h2><p>AI-analys är planerad för version 2.0. Källkod och redaktionella arbetsanteckningar finns på <a href="https://github.com/wglitch/Hypnokort" target="_blank" rel="noopener">GitHub</a>.</p></article>`; }
function navigate(){closeLibrary();document.body.classList.remove('card-mode');patternObserver?.disconnect();stopTimer();stopAudio();state.started=false;state.exercise=null;const [page,id]=location.hash.slice(1).split('/');$$('.nav a').forEach(a=>{const selected=a.dataset.page===(page==='ovning'?'ovningar':page||'kort');a.classList.toggle('active',selected);if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});if(page==='ovningar')renderExercises();else if(page==='ovning')renderExercise(id);else if(page==='ljud')renderAudio();else if(page==='om')renderAbout();else renderCards();window.scrollTo({top:0,behavior:'instant'});}
document.addEventListener('click',async e=>{
 const button=e.target.closest('button');if(!button||button.disabled)return;
 if(button.dataset.deck){state.deck=button.dataset.deck;state.index=0;state.back=false;renderLibrary();refreshCard();return;}
 if(button.dataset.index!==undefined){state.index=Number(button.dataset.index);state.back=false;showCards();return;}
 if(button.dataset.mode){showNotes(button.dataset.mode);return;}
 if(button.dataset.audioChoice){const id=button.dataset.audioChoice;audio.selection.has(id)?audio.selection.delete(id):audio.selection.add(id);save('audioSelection',[...audio.selection]);button.classList.toggle('active',audio.selection.has(id));button.setAttribute('aria-pressed',audio.selection.has(id));return;}
 const action=button.dataset.action;
 if(action==='library'){renderLibrary();$('#library-dialog').showModal();return;}
 if(action==='close-library'){closeLibrary();return;}
 if(action==='resume-cards'){showCards();return;}
 if(['prev','next','shuffle','flip','favorite'].includes(action)){
 const all=filtered();const card=all[state.index];if(!card)return;
 if(action==='prev')state.index=Math.max(0,state.index-1);
 if(action==='next')state.index=Math.min(all.length-1,state.index+1);
 if(action==='shuffle'){const c=pick(all,card);state.index=all.indexOf(c);}
 if(action==='flip')state.back=!state.back;
 else if(action==='favorite'){state.favs.has(card.id)?state.favs.delete(card.id):state.favs.add(card.id);save('favorites',[...state.favs]);toast(state.favs.has(card.id)?'Sparad som favorit':'Favoriten borttagen');}
 else state.back=false;refreshCard();return;}
 if(action==='filter-favorites'){state.favoritesOnly=!state.favoritesOnly;state.index=0;state.back=false;renderLibrary();refreshCard();}
 if(action==='reset-filters'){state.favoritesOnly=false;state.query='';state.deck='alla';state.index=0;renderCards();}

 if(action==='new-prompt'){resetTimer();state.prompt=pick(state.exercise.bank,state.prompt);state.words=[state.prompt];$('#exercise-prompt').textContent=state.prompt;$('#word-history').textContent='';}
 if(action==='read-prompt')speak(`${state.exercise.instruction} ${promptLabel(state.exercise)}: ${state.prompt}`);
 if(action==='timer'){stopSpeech();toggleTimer();}
 if(action==='reset-timer')resetTimer();
 if(action==='copy-notes'){try{await navigator.clipboard.writeText($('#practice-notes').value);toast('Texten är kopierad.');}catch{toast('Markera texten och kopiera med webbläsarens meny.');}}
 if(action==='audio-start')runAudio();
 if(action==='audio-skip')nextAudio();
 if(action==='audio-stop')stopAudio();
 if(action==='export'){
  const notes={};state.exercises.forEach(ex=>{const value=read('note.'+ex.id,'');if(typeof value==='string'&&value)notes[ex.id]=value;});
  const blob=new Blob([JSON.stringify({version:1,favorites:[...state.favs],seen:[...state.seen],notes},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='hypnokort-mina-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 }
});
document.addEventListener('input',e=>{if(e.target.id==='search'){state.query=e.target.value;state.index=0;state.back=false;refreshCard();}if(e.target.id==='practice-notes'){save('note.'+state.exercise.id,e.target.value);$('#save-note').textContent=storageOK?'Sparat på den här enheten. Ingen text skickas till en server.':'Kunde inte spara. Kopiera texten för att behålla den.';}});
document.addEventListener('change',async e=>{
 if(e.target.id==='duration'){state.duration=Number(e.target.value);save('duration',state.duration);state.seconds=state.duration;drawTimer();}
 if(e.target.id==='audio-duration'){audio.duration=Number(e.target.value);$('#audio-timer').textContent=time(audio.duration);$('#audio-meta').textContent=`${audio.total} uppgifter · ${audio.duration} sekunder egen övning per uppgift`;}
 if(e.target.id==='audio-rounds'){audio.total=Number(e.target.value);$('#audio-meta').textContent=`${audio.total} uppgifter · ${audio.duration} sekunder egen övning per uppgift`;}
 if(e.target.id==='import-data'){
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>2000000)throw Error();const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.favorites)||!Array.isArray(data.seen)||!data.notes||Array.isArray(data.notes)||typeof data.notes!=='object')throw Error();const ids=new Set(state.cards.map(c=>c.id));for(const id of listValue(data.favorites))if(ids.has(id))state.favs.add(id);for(const id of listValue(data.seen))if(ids.has(id))state.seen.add(id);save('favorites',[...state.favs]);save('seen',[...state.seen]);state.exercises.forEach(ex=>{if(typeof data.notes[ex.id]==='string'){const current=read('note.'+ex.id,'');const incoming=data.notes[ex.id];if(incoming&&incoming!==current)save('note.'+ex.id,current?`${current}\n\n—— Importerat ——\n${incoming}`:incoming);}});toast('Dina data har importerats.');}catch{toast('Filen kunde inte läsas. Välj en export från Hypnokort.');}e.target.value='';
 }
});
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(!$('#card-area')||$('#library-dialog').open)return;if(e.key==='ArrowRight'){$('[data-action="next"]')?.click();e.preventDefault();}if(e.key==='ArrowLeft'){$('[data-action="prev"]')?.click();e.preventDefault();}});
let touchStart=null;
document.addEventListener('touchstart',e=>{if(e.target.closest('.language-card')&&!e.target.closest('button'))touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};else touchStart=null;},{passive:true});
document.addEventListener('touchend',e=>{if(!touchStart)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5)$(dx<0?'[data-action="next"]':'[data-action="prev"]')?.click();},{passive:true});
$('#library-dialog').addEventListener('click',e=>{if(e.target===$('#library-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeLibrary();}});
$$('.nav a').forEach(a=>a.addEventListener('click',()=>closeLibrary()));
window.addEventListener('hashchange',navigate);
window.addEventListener('pagehide',()=>{stopTimer();stopAudio();});
fetch('./data.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{state.cards=data.cards;state.exercises=data.exercises;const ids=new Set(state.cards.map(c=>c.id));state.favs=new Set([...state.favs].filter(id=>ids.has(id)));state.seen=new Set([...state.seen].filter(id=>ids.has(id)));audio.selection=new Set([...audio.selection].filter(id=>state.exercises.some(ex=>ex.id===id)));navigate();if(!storageOK)toast('Lokal lagring är inte tillgänglig i den här webbläsaren.');}).catch(()=>{$('#main').innerHTML='<div class="empty"><h1>Kortleken kunde inte laddas.</h1><p>Kontrollera anslutningen och ladda om sidan.</p><button class="btn primary" onclick="location.reload()">Försök igen</button></div>';});
