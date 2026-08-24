(() => {
  const appTitles={dashboard:"Ana Sayfa",practice:"Tekrar & Alıştırma",lesson:"Ünite Çalışması",recordings:"Canlı Ders Kayıtları",library:"Dijital Kütüphane",youtube:"Ücretsiz Videolar",exam:"Sınav Hazırlık",schedule:"Sınav Takvimi"};

  function showAppView(name){
    document.querySelectorAll(".app-view").forEach(v=>v.classList.remove("active"));
    document.getElementById("app-"+name)?.classList.add("active");
    document.querySelectorAll(".app-nav").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
    document.getElementById("appTitle").textContent=appTitles[name]||"AYDA";
    document.querySelector(".app-shell")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  document.querySelectorAll(".app-nav,.app-jump").forEach(b=>b.addEventListener("click",()=>showAppView(b.dataset.view)));

  const data={
    A1:{
      units:[
        ["Guten Tag!","Tanışma ve temel iletişim"],["Freunde, Kollegen und ich","Kişiler ve iletişim"],["In Hamburg","Şehir ve yerler"],["Guten Appetit!","Yiyecek ve içecek"],["Tag für Tag","Günlük rutin"],["Zeit mit Freunden","Boş zaman"]
      ],
      lesson:{topic:"Tanışma ve temel iletişim",grammar:"sein • heißen • kişisel bilgiler",summary:"A1 başlangıcında öğrenci kendini tanıtma, adını söyleme ve temel kişisel bilgi sorma kalıplarını tekrar eder.",examples:["Ich heiße Anna.","Ich bin aus der Türkei.","Wie heißen Sie?"],q:"Ich ___ Onur.",options:["heiße","heißt","heißen"],answer:0,explain:"Ich ile fiil biçimi heiße olur."}
    },
    A2:{
      units:[
        ["Mein Opa war auch schon Bäcker.","Berufe und Familie"],["Wohin mit der Kommode?","Wohnen und Umzug"],["Hier finden Sie Ruhe und Erholung.","Reisen und Unterkunft"],["Was darf es sein?","Einkaufen und Service"],["Schau mal, der schöne Dom!","Kultur"],["Meine Lieblingsveranstaltung","Zaman ifadeleri"],["Wir könnten montags joggen gehen.","Sport und Fitness"],["Hoffentlich ist es nicht das Herz!","Gesundheit"]
      ],
      lesson:{topic:"Berufe und Familie",grammar:"unser/euer • Perfekt tekrarı • war/hatte",summary:"Aile hikâyesi anlatırken kişileri ve geçmişteki durumları birbirine bağlarız. unser/euer isimden önce artikel gibi çekilir; war ve hatte geçmişteki durum ve sahipliği kısa biçimde anlatır.",examples:["Das ist unser Onkel.","Früher hatte meine Oma ein Café.","Wir haben gestern lange telefoniert."],q:"Das ist ___ Familienfoto.",options:["unser","unsere","unseren"],answer:0,explain:"Familienfoto nötr ve Nominativ olduğu için unser."}
    },
    B1:{
      units:[
        ["Wer bin ich?","Kişilik"],["Erinnerungen","Geçmiş ve deneyimler"],["Wo ich wohne","Yaşam alanı"],["Obwohl ich Ihnen das erklärt habe, ...","Şikâyet ve karşıtlık"],["Arbeit und Alltag","İş yaşamı"],["Etwas planen","Planlama"]
      ],
      lesson:{topic:"Müşteri hizmetleri ve karşıtlık",grammar:"obwohl • trotzdem",summary:"obwohl beklenmeyen karşıtlığı yan cümleyle kurar; trotzdem ise ikinci bir ana cümlede sonucu öne çıkarır. Anlam yakın olsa da cümle yapıları farklıdır.",examples:["Obwohl ich bezahlt habe, kam die Ware nicht.","Ich habe bezahlt. Trotzdem kam die Ware nicht.","Warum ist der Anschluss gesperrt, obwohl die Rechnung bezahlt ist?"],q:"___ ich dreimal angerufen habe, bekam ich keine Antwort.",options:["Trotzdem","Obwohl","Denn"],answer:1,explain:"Çekimli fiil habe sonda olduğu için obwohl yan cümlesi gerekir."}
    }
  };
  let currentLevel="A2";

  function renderUnits(level){
    currentLevel=level;
    document.querySelectorAll(".level-tabs button").forEach(b=>b.classList.toggle("active",b.dataset.level===level));
    const units=data[level].units;
    let html=units.map((u,i)=>`<article class="unit-card"><small>ÜNİTE ${i+1}</small><b>${u[0]}</b><span>${u[1]}</span><button data-unit="${i}">Üniteyi aç →</button></article>`).join("");
    for(let i=units.length;i<9;i++) html+=`<article class="unit-card locked"><small>ÜNİTE ${i+1}</small><b>Demo kapsamında kapalı</b><span>Gerçek öğrenci hesabında ilgili içerik görünür.</span></article>`;
    document.getElementById("unitGrid").innerHTML=html;
    document.querySelectorAll("[data-unit]").forEach(b=>b.addEventListener("click",()=>openLesson(level,+b.dataset.unit)));
  }
  document.querySelectorAll(".level-tabs button").forEach(b=>b.addEventListener("click",()=>renderUnits(b.dataset.level)));

  function openLesson(level,index){
    const unit=data[level].units[index]||data[level].units[0], base=data[level].lesson;
    document.getElementById("lessonLevel").textContent=`${level} • ÜNİTE ${index+1}`;
    document.getElementById("lessonTitle").textContent=unit[0];
    document.getElementById("lessonTopic").textContent=unit[1];
    document.getElementById("lessonSummary").textContent=index===0?base.summary:"Bu ünitenin tam içeriği demo kapsamında yayınlanmıyor. Gerçek öğrenci hesabında konu anlatımı, video, örnekler ve kontrollü alıştırmalar aynı akışta açılır.";
    const ex=index===0?base.examples:["Konu anlatımı","Örnek cümleler","Kontrollü alıştırma"];
    document.getElementById("lessonExamples").innerHTML=ex.map(x=>`<div>${x}</div>`).join("");
    document.getElementById("lessonMeta").innerHTML=`<div><b>Seviye</b>${level}</div><div><b>Konu</b>${unit[1]}</div><div><b>Odak</b>${index===0?base.grammar:"Üniteye göre değişir"}</div><div><b>Akış</b>Video + özet + alıştırma</div>`;
    document.getElementById("quizQuestion").textContent=index===0?base.q:"Demo kontrol sorusu: Gerçek panelde bu üniteye ait özgün alıştırmalar burada görünür.";
    const options=index===0?base.options:["Örnek seçenek A","Örnek seçenek B","Örnek seçenek C"], answer=index===0?base.answer:1, explain=index===0?base.explain:"Demo etkileşim tamamlandı.";
    document.getElementById("quizOptions").innerHTML=options.map((x,i)=>`<button class="quiz-option" data-opt="${i}">${x}</button>`).join("");
    document.getElementById("quizFeedback").textContent="";
    document.querySelectorAll("[data-opt]").forEach(btn=>btn.addEventListener("click",()=>{
      document.querySelectorAll("[data-opt]").forEach(x=>x.classList.remove("correct","wrong"));
      const ok=+btn.dataset.opt===answer;btn.classList.add(ok?"correct":"wrong");
      if(!ok) document.querySelectorAll("[data-opt]")[answer].classList.add("correct");
      document.getElementById("quizFeedback").textContent=ok?"✓ Doğru. "+explain:"✕ Doğru cevap gösterildi. "+explain;
    }));
    showAppView("lesson");
  }
  document.getElementById("backUnits").addEventListener("click",()=>showAppView("practice"));

  const recordings=[
    {chip:"A2 • CANLI DERS KAYDI",title:"Wohin mit der Kommode?",desc:"Wechselpräpositionen • Wo? / Wohin?",duration:4680,label:"01:18:00"},
    {chip:"A2 • CANLI DERS KAYDI",title:"Wenn es warm ist ...",desc:"wenn-Nebensatz • cümle sırası",duration:4260,label:"01:11:00"},
    {chip:"B1 • CANLI DERS KAYDI",title:"obwohl / trotzdem",desc:"Karşıtlık • yan cümle / ana cümle",duration:5040,label:"01:24:00"},
    {chip:"ETÜT • CANLI KAYIT",title:"Haftalık etüt tekrarı",desc:"Eksik tamamlama • soru-cevap",duration:3120,label:"00:52:00"}
  ];
  let recIndex=0,recSeconds=0,recPlaying=false,recTimer=null;
  const recordChip=document.getElementById("recordChip"),recordTitle=document.getElementById("recordTitle"),recordDesc=document.getElementById("recordDesc"),recordPlay=document.getElementById("recordPlay"),recordProgress=document.getElementById("recordProgress"),recordTime=document.getElementById("recordTime");
  const fmt=s=>{s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;return(h?String(h).padStart(2,"0")+":":"")+String(m).padStart(2,"0")+":"+String(ss).padStart(2,"0")};
  function renderRec(){
    const r=recordings[recIndex];
    recordChip.textContent=r.chip;recordTitle.textContent=r.title;recordDesc.textContent=r.desc;
    recordProgress.style.width=`${Math.min(100,recSeconds/r.duration*100)}%`;recordTime.textContent=`${fmt(recSeconds)} / ${r.label}`;recordPlay.textContent=recPlaying?"Ⅱ":"▶";
    document.querySelectorAll(".record-item").forEach((b,i)=>b.classList.toggle("active",i===recIndex));
  }
  recordPlay.addEventListener("click",()=>{
    recPlaying=!recPlaying;
    if(recPlaying){clearInterval(recTimer);recTimer=setInterval(()=>{recSeconds+=60;const r=recordings[recIndex];if(recSeconds>=r.duration){recSeconds=r.duration;recPlaying=false;clearInterval(recTimer)}renderRec()},650)}
    else clearInterval(recTimer);
    renderRec();
  });
  document.querySelectorAll(".record-item").forEach((b,i)=>b.addEventListener("click",()=>{recIndex=i;recSeconds=0;recPlaying=false;clearInterval(recTimer);renderRec()}));

  const resources=[
    ["A1","Ders","A1 Ders Materyalleri","Ders içinde kullanılan temel kaynaklar."],
    ["A1","Video","A1 Menschen Ders Videoları","Ders ve tekrar videoları."],
    ["A1","Quizlet","A1 Menschen Kelime Alıştırmaları","Kelime tekrarları."],
    ["A2","Ders","A2 Ders Materyalleri","Ders ve yararlı materyaller."],
    ["A2","Video","A2 Menschen Ders Videoları","A2 ders tekrarları."],
    ["A2","Konu","A2 Konu Anlatım Videoları","Gramer ve ünite anlatımları."],
    ["A2","Quizlet","A2 Kelime Alıştırmaları","Kelime pekiştirme."],
    ["B1","Video","B1 Ünite Videoları","Ünite bazlı video tekrarları."],
    ["B1","Konuşma","B1 Sprechen Çalışmaları","Sich vorstellen, Meinung, Planung."],
    ["SINAV","Sınav","A1 Sınav Hazırlık","Başlangıç seviye sınav kaynakları."],
    ["SINAV","Sınav","A2 Sınav Hazırlık","Lesen, Schreiben ve Sprechen."],
    ["SINAV","Sınav","B1 TELC Hazırlık","Lesen, Sprachbausteine ve Hören."]
  ];
  const resourceGrid=document.getElementById("resourceGrid");
  function renderResources(filter="ALL"){
    resourceGrid.innerHTML=resources.filter(r=>filter==="ALL"||r[0]===filter).map(r=>`<article class="resource-card"><small>${r[0]} • ${r[1]}</small><b>${r[2]}</b><p>${r[3]}</p></article>`).join("");
  }
  document.querySelectorAll("#libraryFilters button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("#libraryFilters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderResources(b.dataset.filter)}));

  const ytBase="https://www.youtube-nocookie.com/embed/videoseries?list=PLQwhOGFlptnJEKUTuUAAuvhZneyunFEcW&rel=0";
  const youtubeFrame=document.getElementById("youtubeFrame");
  document.querySelectorAll("#ytButtons button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("#ytButtons button").forEach(x=>x.classList.remove("active"));b.classList.add("active");const i=+b.dataset.index;youtubeFrame.src=ytBase+(i?`&index=${i}`:"")}));

  const examQs=[
    {q:'"Geburtsdatum" ne demektir?',opts:["Doğum yeri","Doğum tarihi","Medeni hâl"],a:1,fb:"Geburtsdatum = doğum tarihi.",tip:"Formlarda Geburtsdatum doğum tarihi, Geburtsort doğum yeri anlamına gelir.",title:"Form kelimeleri"},
    {q:'Cümleyi tamamla: "Bitte ___ Sie das Formular aus."',opts:["füllen","fahren","finden"],a:0,fb:"Bitte füllen Sie das Formular aus.",tip:"Formular kelimesi, ausfüllen (form doldurmak) fiilini güçlü biçimde işaret eder.",title:"Bağlamdan fiili bul"},
    {q:"Hangisi sağlık / randevu bağlamına uygundur?",opts:["der Termin","die Kaution","das Gleis"],a:0,fb:"Termin = randevu.",tip:"Aynı konudaki kelimeleri birlikte çalışmak sınav metnini daha hızlı anlamaya yardım eder.",title:"Konu grupları"}
  ];
  let eq=0,score=0,selected=null,locked=false;
  const examProgress=document.getElementById("examProgress"),examQuestion=document.getElementById("examQuestion"),examTipTitle=document.getElementById("examTipTitle"),examTip=document.getElementById("examTip"),examFeedback=document.getElementById("examFeedback"),examCheck=document.getElementById("examCheck"),examNext=document.getElementById("examNext"),examRestart=document.getElementById("examRestart"),examScoreWrap=document.getElementById("examScoreWrap"),examScore=document.getElementById("examScore"),examOptions=document.getElementById("examOptions");
  function renderExam(){
    const x=examQs[eq];selected=null;locked=false;examProgress.textContent=`${eq+1} / ${examQs.length}`;examQuestion.textContent=x.q;examTipTitle.textContent=x.title;examTip.textContent=x.tip;examFeedback.textContent="";examCheck.hidden=false;examNext.hidden=true;examRestart.hidden=true;examScoreWrap.hidden=true;
    examOptions.innerHTML=x.opts.map((o,i)=>`<button class="quiz-option" data-eopt="${i}">${o}</button>`).join("");
    document.querySelectorAll("[data-eopt]").forEach(b=>b.addEventListener("click",()=>{if(locked)return;selected=+b.dataset.eopt;document.querySelectorAll("[data-eopt]").forEach(x=>x.classList.remove("selected","correct","wrong"));b.classList.add("selected")}));
  }
  examCheck.addEventListener("click",()=>{if(selected===null){examFeedback.textContent="Önce bir seçenek seç.";return}const x=examQs[eq];locked=true;document.querySelectorAll("[data-eopt]").forEach((b,i)=>{b.classList.remove("correct","wrong");if(i===x.a)b.classList.add("correct");if(i===selected&&i!==x.a)b.classList.add("wrong")});if(selected===x.a){score++;examFeedback.textContent="✓ Doğru. "+x.fb}else examFeedback.textContent="✕ "+x.fb;examCheck.hidden=true;if(eq<examQs.length-1)examNext.hidden=false;else{examProgress.textContent="Tamamlandı";examScore.textContent=`${score} / ${examQs.length}`;examScoreWrap.hidden=false;examRestart.hidden=false}});
  examNext.addEventListener("click",()=>{eq++;renderExam()});examRestart.addEventListener("click",()=>{eq=0;score=0;renderExam()});

  document.querySelectorAll("#examFilters button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("#examFilters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");const k=b.dataset.kind;document.querySelectorAll("[data-exam]").forEach(c=>c.style.display=(k==="all"||c.dataset.exam.split(" ").includes(k))?"flex":"none")}));
  const telcCountdown=document.getElementById("telcCountdown"),telcStatus=document.getElementById("telcStatus");
  function countdown(){
    const target=new Date("2026-08-30T10:00:00+03:00"),now=new Date(),d=target-now;
    if(d<=0){telcCountdown.textContent="Bu tarih geçti — güncel oturum için AYDA’ya sor.";telcStatus.textContent="Tarih geçti";telcStatus.classList.remove("success");telcStatus.classList.add("info");return}
    const days=Math.floor(d/86400000),hours=Math.floor((d%86400000)/3600000);telcCountdown.textContent=`Sınava ${days} gün ${hours} saat kaldı`;
  }
  countdown();setInterval(countdown,60000);

  renderUnits("A2");renderResources();renderRec();renderExam();
})();