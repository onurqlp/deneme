
/* AYDA Experience V2 | progressive demo, no account or personal information required */
(function(){
  'use strict';
  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const KEY='ayda_experience_v2';
  const goalNames={baslangic:'Sıfırdan Almanca',ilerleme:'Almancamı geliştirmek',sinav:'ÖSD / telc / Goethe sınavı',almanya:'Almanya hedefim'};
  const samples={
    A1:{title:'Kendini Almanca tanıt',topic:'A1 · İlk adım',desc:'İsmini söylemeyi, nereli olduğunu anlatmayı ve kısa sorular sormayı öğren.',summary:'Almancada adımızı söylerken „Ich heiße …“, nereli olduğumuzu söylerken „Ich komme aus …“ kullanırız. Cümleleri gerçek hayatta küçük konuşmalarda tekrar etmek önemlidir.',examples:['Ich heiße Deniz. — Benim adım Deniz.','Ich komme aus der Türkei. — Türkiye’den geliyorum.','Wie heißen Sie? — Adınız ne?'],questions:[
      {q:'“Benim adım Deniz” hangi cümle?',options:['Ich heiße Deniz.','Du heißt Deniz.','Er heißt Deniz.'],a:0,why:'Ich = ben. Kendi adını söylerken „Ich heiße …“ kullanılır.'},
      {q:'“Türkiye’den geliyorum” hangisi?',options:['Ich komme aus der Türkei.','Ich wohne in der Schule.','Ich bin vierzig.'],a:0,why:'Ülke kökenini „Ich komme aus …“ ifadesiyle anlatabilirsin.'},
      {q:'“Wie heißen Sie?” ne demek?',options:['Nerede yaşıyorsunuz?','Adınız ne?','Nasılsınız?'],a:1,why:'„Wie heißen Sie?“ kibar hitapla birinin adını sormaktır.'}
    ]},
    A2:{title:'Aile ve geçmişten bahset',topic:'A2 · Günlük yaşam',desc:'Gündelik bir konuşmada aileyi anlat, geçmişteki bir durumdan söz et.',summary:'Geçmişteki durum ve sahipliği anlatırken „war“ ve „hatte“ kullanılabilir. „Unser“ gibi iyelik sözcükleri isimle birlikte doğru biçimde çekilir.',examples:['Das ist unser Familienfoto. — Bu bizim aile fotoğrafımız.','Früher hatte meine Oma ein Café. — Eskiden büyükannemin kafesi vardı.','Gestern war ich zu Hause. — Dün evdeydim.'],questions:[
      {q:'Das ist ___ Familienfoto.',options:['unser','unsere','unseren'],a:0,why:'Familienfoto nötr ve Nominativ olduğu için „unser“ kullanılır.'},
      {q:'Gestern ___ ich zu Hause.',options:['hatten','war','waren'],a:1,why:'„ich“ ile „sein“ fiilinin Präteritum biçimi „war“ olur.'},
      {q:'“Früher hatte ich ein Fahrrad” ne anlatır?',options:['Gelecek planı','Geçmişte sahip olma','Şimdiki zorunluluk'],a:1,why:'„hatte“ geçmişte sahip olma durumunu belirtir.'}
    ]},
    B1:{title:'Görüşünü daha güçlü anlat',topic:'B1 · Karşıtlık kurma',desc:'Zıt durumları obwohl ve trotzdem ile bağlayarak daha güçlü cümleler oluştur.',summary:'„Obwohl“ yan cümle kurar ve çekimli fiil sona gider. „Trotzdem“ ise yeni bir ana cümle başlatabilir; sonrasında çekimli fiil ikinci konumdadır.',examples:['Obwohl ich müde bin, lerne ich. — Yorgun olmama rağmen çalışıyorum.','Ich bin müde. Trotzdem lerne ich. — Yorgunum. Yine de çalışıyorum.','Obwohl es regnet, gehe ich spazieren. — Yağmur yağmasına rağmen yürüyorum.'],questions:[
      {q:'___ ich müde bin, lerne ich.',options:['Trotzdem','Obwohl','Denn'],a:1,why:'Fiil yan cümlede sonda olduğundan „obwohl“ kullanılır.'},
      {q:'Ich bin müde. ___ lerne ich.',options:['Trotzdem','Obwohl','Weil'],a:0,why:'İkinci ana cümleye „Trotzdem“ ile başlanabilir.'},
      {q:'Hangisinde yan cümle fiili doğru yerde?',options:['Obwohl ich bin müde, lerne ich.','Obwohl müde ich bin, lerne ich.','Obwohl ich müde bin, lerne ich.'],a:2,why:'„obwohl“ yan cümlesinde çekimli fiil „bin“ sonda olmalıdır.'}
    ]},
    B2:{title:'B2 yolculuğuna hazırlık',topic:'B2 · Gelişmiş iletişim',desc:'B2 programında daha ayrıntılı görüş belirtme, tartışma, yazma ve metin çalışmaları hedeflenir. Bu halka açık mini örnek B1→B2 geçişindeki bir konuyu gösterir.',summary:'B2’de daha karmaşık düşünceleri ifade edebilmek için sağlam B1 bağlantı cümlelerini kullanmak önemlidir. Aşağıdaki kısa örnek B2 kurs içeriğinin tamamını temsil etmez.',examples:['Obwohl es schwierig ist, lohnt es sich.','Ich würde diesem Vorschlag grundsätzlich zustimmen.','Einerseits kostet es Zeit, andererseits bringt es Vorteile.'],questions:[
      {q:'„Einerseits … andererseits …“ ne işe yarar?',options:['Karşıt iki yönü ifade eder','Sadece geçmiş zaman anlatır','Rica cümlesi kurar'],a:0,why:'İki farklı yönü veya karşıt gerekçeyi birlikte anlatır.'},
      {q:'„Ich würde zustimmen“ neyi ifade eder?',options:['Koşullu/kibar bir görüşü','Geçmişte biten bir işi','Bir emri'],a:0,why:'Konjunktiv II bir görüşü daha yumuşak ifade edebilir.'},
      {q:'„Obwohl es regnet, …“ için doğru devam?',options:['… wir bleiben zu Hause.','… gehe ich spazieren.','… ich gehe spazieren.'],a:1,why:'Önde yan cümle varsa ana cümle çekimli fiille başlar: „gehe ich …“.'}
    ]}
  };
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){}
  const state={level:samples[saved.level]?saved.level:'A1',goal:goalNames[saved.goal]?saved.goal:'baslangic',step:0,quiz:0,selected:null,checked:false,score:0,finished:false};
  const emit=(name,params={})=>{
    try{
      if(typeof window.gtag==='function') window.gtag('event',name,params);
      else if(Array.isArray(window.dataLayer)) window.dataLayer.push(Object.assign({event:name},params));
      document.dispatchEvent(new CustomEvent('ayda:experience',{detail:Object.assign({event:name},params)}));
    }catch(e){}
  };
  const keep=()=>{try{localStorage.setItem(KEY,JSON.stringify({level:state.level,goal:state.goal}))}catch(e){}};
  function waUrl(){
    const s=state.finished?'Mini öğrenme deneyimini tamamladım. ':'';
    const msg='Merhaba AYDA, deneme sayfanızı inceledim. '+s+'Hedefim: '+goalNames[state.goal]+'. İlgilendiğim seviye: '+state.level+'. Bana uygun canlı online kurs, güncel program, ücret ve kayıt koşulları hakkında bilgi alabilir miyim?';
    return 'https://wa.me/905409112503?text='+encodeURIComponent(msg);
  }
  function updateLeads(){
    $$('.ex-wa').forEach(a=>a.href=waUrl());
    const summary=$('#ex-wizard-summary');
    if(summary)summary.textContent='Hedefin: '+goalNames[state.goal]+' · Seviye: '+state.level+'. Seçimlerini istediğin zaman değiştirebilirsin.';
    const course=$('#ex-course-title');
    if(course)course.textContent=state.level+' Almanca programını keşfet';
    const lead=$('#ex-course-lead');
    if(lead)lead.textContent=state.goal==='sinav'?'Sınav hedefini ve uygun eğitim yolunu birlikte belirleyelim. Hazırlık ve sınav kaydı ayrı süreçlerdir.':state.goal==='almanya'?'Aile birleşimi, mesleki eğitim, iş veya üniversite hedefin için seviyene göre bir çalışma planı konuşalım.':'Canlı ders, tekrar, speaking ve dijital çalışma alanlarını kapsayan güncel seçenekleri incele.';
    $$('.ex-choice').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.exGoal===state.goal)));
    $$('.ex-levels button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.exLevel===state.level)));
  }
  function renderLesson(){
    const sample=samples[state.level];
    $('#ex-lesson-level').textContent=sample.topic;
    $('#ex-lesson-title').textContent=sample.title;
    $('#ex-lesson-description').textContent=sample.summary;
    $('#ex-lesson-examples').replaceChildren();
    sample.examples.forEach(t=>{const d=document.createElement('div');d.textContent=t;$('#ex-lesson-examples').appendChild(d)});
    $('#ex-lesson-hint').textContent=state.level==='B2'?'Not: B2 seçimi için bu ücretsiz önizleme bir geçiş örneğidir. Tam B2 içeriği burada açık değildir.':'Bu, ücretsiz tanıtım için hazırlanmış kısa bir örnektir. Tam öğrenci panelinde daha kapsamlı üniteler bulunur.';
    $('#ex-lab-level').textContent=state.level+' • Örnek öğrenci';
  }
  function renderQuiz(){
    const q=samples[state.level].questions[state.quiz];
    $('#ex-question-title').textContent=(state.quiz+1)+' / 3 · '+q.q;
    const opts=$('#ex-answer-options');opts.replaceChildren();
    q.options.forEach((o,i)=>{
      const b=document.createElement('button');b.type='button';b.textContent=String.fromCharCode(65+i)+' · '+o;
      b.setAttribute('aria-pressed',String(state.selected===i));
      if(state.checked){b.disabled=true;if(i===q.a)b.classList.add('correct');else if(i===state.selected)b.classList.add('wrong')}
      b.addEventListener('click',()=>{if(state.checked)return;state.selected=i;renderQuiz()});
      opts.appendChild(b);
    });
    const fb=$('#ex-quiz-feedback'); fb.hidden=!state.checked;
    fb.textContent=state.checked?(state.selected===q.a?'✓ Doğru! ':'Doğru yanıt: '+q.options[q.a]+'. ')+q.why:'';
    $('#ex-check-answer').hidden=state.checked;
    $('#ex-check-answer').disabled=state.selected===null;
    $('#ex-next-question').hidden=!state.checked;
    $('#ex-next-question').textContent=state.quiz===2?'Sonucumu gör →':'Sonraki soru →';
    $('#ex-quiz-progress').style.width=String(((state.quiz+(state.checked?1:0))/3)*100)+'%';
    $('#ex-result').hidden=true;$('#ex-quiz-working').hidden=false;
  }
  function showResult(){
    $('#ex-result').hidden=false;$('#ex-quiz-working').hidden=true;
    $('#ex-result-score').textContent=state.score+' / 3';
    $('#ex-result-text').textContent='Bu sonuç yalnızca üç soruluk örnek etkinliğe aittir; resmi seviye belirleme veya sınav puanı değildir. AYDA’da öğrenme, tekrar ve öğretmen desteğiyle devam eder.';
    state.finished=true;
    emit('lesson_complete',{level:state.level,goal:state.goal,score:state.score});
    updateLeads();
  }
  function setStep(n){
    state.step=Math.max(0,Math.min(3,n));
    $$('.ex-steps button').forEach(b=>b.setAttribute('aria-selected',String(Number(b.dataset.exStep)===state.step)));
    $$('.ex-tab').forEach((el,i)=>el.classList.toggle('active',i===state.step));
    const status=$('#ex-progress-label');if(status) status.textContent=(state.step+1)+' / 4 aşama';
    const bar=$('#ex-progress-total');if(bar)bar.style.width=((state.step+1)*25)+'%';
    if(state.step===1){const frame=$('#ex-lesson-video');if(frame&&!frame.src&&frame.dataset.src)frame.src=frame.dataset.src}
    emit('demo_step_view',{step:state.step+1,level:state.level});
  }
  function resetQuiz(){
    state.quiz=0;state.selected=null;state.checked=false;state.score=0;state.finished=false;renderQuiz();updateLeads();
  }
  $$('.ex-choice').forEach(b=>b.addEventListener('click',()=>{
    state.goal=b.dataset.exGoal;
    if(state.goal==='baslangic')state.level='A1';
    keep();resetQuiz();renderLesson();updateLeads();emit('demo_goal_select',{goal:state.goal});
  }));
  $$('.ex-levels button').forEach(b=>b.addEventListener('click',()=>{
    state.level=b.dataset.exLevel;keep();resetQuiz();renderLesson();updateLeads();emit('demo_level_select',{level:state.level});
  }));
  $$('.ex-start').forEach(b=>b.addEventListener('click',()=>{
    emit('demo_start',{level:state.level,goal:state.goal});
    setStep(0);
    $('#deneyim').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  }));
  $$('.ex-steps button').forEach(b=>b.addEventListener('click',()=>setStep(Number(b.dataset.exStep))));
  $$('.ex-next-step').forEach(b=>b.addEventListener('click',()=>setStep(state.step+1)));
  $('#ex-check-answer')?.addEventListener('click',()=>{
    if(state.selected===null||state.checked)return;
    state.checked=true;
    if(state.selected===samples[state.level].questions[state.quiz].a)state.score++;
    emit('demo_answer',{level:state.level,index:state.quiz+1,correct:state.selected===samples[state.level].questions[state.quiz].a});
    renderQuiz();
  });
  $('#ex-next-question')?.addEventListener('click',()=>{
    if(!state.checked)return;
    if(state.quiz<2){state.quiz++;state.selected=null;state.checked=false;renderQuiz()}else showResult();
  });
  $('#ex-restart-quiz')?.addEventListener('click',()=>{resetQuiz();setStep(2)});
  $$('.ex-open-panel').forEach(b=>b.addEventListener('click',()=>{
    emit('open_student_panel',{level:state.level});
    const view=b.dataset.panelView||'practice';
    const nav=$('.app-nav[data-view="'+view+'"]');
    if(nav)nav.click();
    else $('#demo')?.scrollIntoView();
  }));
  $$('.ex-wa').forEach(a=>a.addEventListener('click',()=>emit('whatsapp_click',{goal:state.goal,level:state.level,completed:state.finished,placement:a.dataset.placement||'page'})));
  $$('.ex-course-link').forEach(a=>a.addEventListener('click',()=>emit('course_link_click',{goal:state.goal,level:state.level})));
  const oldRec=$('#recordPlay');
  if(oldRec){
    oldRec.textContent='▶';
    oldRec.title='Halka açık gerçek ders örneğini aç';
    oldRec.addEventListener('click',e=>{
      e.preventDefault();e.stopImmediatePropagation();
      $('.app-nav[data-view="replays"]')?.click();
      emit('real_video_example_open',{source:'recordings_preview'});
    },true);
    const tag=$('.fake-player .player-bottom small');if(tag)tag.textContent='Temsili ekran · Gerçek ders örneği için tıklayın';
    const info=$('#app-recordings .info-note');
    if(info)info.textContent='Bu alan gerçek öğrenci kaydı değildir; arayüz tanıtımıdır. Halka açık AYDA videosunu izlemek için oynat düğmesini kullanabilirsiniz. Özel ders kayıtları paylaşılmaz.';
  }
  const scheduleTile=$('#app-schedule .schedule-card[data-exam="telc"]');
  if(scheduleTile) scheduleTile.setAttribute('aria-hidden','true');
  renderLesson();renderQuiz();updateLeads();setStep(0);
  const params=new URLSearchParams(location.search);if(params.get('demo')==='1')$('#basla')?.scrollIntoView();
})();
