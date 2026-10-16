
"use strict";
(() => {
  const API=window.CoinLiveAPI;
  if(!API){console.warn("COIN.LIVE Pro requires the base app");return;}
  const {S,candles,fmt,pc,usd,baseScore,plan}=API;
  const $=id=>document.getElementById(id);
  const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const number=(n,d=0)=>Number.isFinite(+n)?+n:d;
  const localDay=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const money=n=>(n<0?"−":"")+"$"+Math.abs(n).toFixed(2);
  const P={
    tf:"15m",bars:[],barsSymbol:"",barsProvider:"",lastChartLoad:0,loadingChart:false,nonce:0,shift:0,hover:null,
    news:[],newsError:"",lastNews:0,lastNewsCheck:0,oiCheck:0,
    custom:parse("cl_custom_alerts",[]),
    paper:parse("cl_paper_v3",{balance:100,initial:100,events:[],active:null,lossStreak:0,paused:false,day:localDay(),dayLoss:0,dayStart:100}),
    lastRender:0,lastMarket:0,watchSym:""
  };
  function parse(key,fallback){try{const d=JSON.parse(localStorage.getItem(key));return d??fallback;}catch(e){return fallback;}}
  function store(){try{localStorage.setItem("cl_paper_v3",JSON.stringify(P.paper));localStorage.setItem("cl_custom_alerts",JSON.stringify(P.custom));}catch(e){}}
  const chart=$("proChart"),ctx=chart.getContext("2d"),hover=$("chartHover"),levelLegend=$("chartLegend");
  const colors={green:"#34dbac",red:"#ff6d89",blue:"#61baff",gray:"#91a6c3",gold:"#f8bc57"};
  function event(note,tone=""){const el=$("proNotice");el.textContent=note;el.style.color=tone==="bad"?"#ff9eb0":tone==="ok"?"#55dfb6":"#aec4df";}
  function dateString(ms){return new Date(ms).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Istanbul"});}
  function minutesOf(tf){return {"15m":15,"1h":60,"4h":240,"1d":1440}[tf]||15;}
  function emaSeries(data,period){const out=[],mult=2/(period+1);let value=NaN;for(const row of data){value=Number.isFinite(value)?row.close*mult+value*(1-mult):row.close;out.push(value);}return out;}
  function choose(symbol){const o=S.items.get(symbol);if(!o)return;S.selected=symbol;P.shift=0;P.bars=[];P.barsSymbol="";P.nonce++;const a=API.render;if(typeof a==="function")a();loadChart();renderAnalysis();renderCustom();}
  $("chartCoin").addEventListener("change",e=>choose(e.target.value));
  document.querySelectorAll("[data-candle]").forEach(btn=>btn.addEventListener("click",()=>{
    P.tf=btn.dataset.candle;P.bars=[];P.barsSymbol="";P.shift=0;P.nonce++;
    document.querySelectorAll("[data-candle]").forEach(b=>b.classList.toggle("active",b===btn));
    loadChart();
  }));
  $("chartZoomIn").onclick=()=>{P.shift=Math.min(40,P.shift+10);drawChart();};
  $("chartZoomOut").onclick=()=>{P.shift=Math.max(-30,P.shift-10);drawChart();};
  $("chartReset").onclick=()=>{P.shift=0;P.hover=null;drawChart();};
  let chartTimer=0,chartClient=null;
  chart.addEventListener("pointermove",e=>{chartClient=e.clientX;P.hover=e.clientX;drawChart();});
  chart.addEventListener("pointerleave",()=>{P.hover=null;drawChart();});
  chart.addEventListener("wheel",e=>{e.preventDefault();P.shift=Math.max(-30,Math.min(40,P.shift+(e.deltaY<0?5:-5)));drawChart();},{passive:false});
  let firstTouch=null;
  chart.addEventListener("touchstart",e=>{if(e.touches.length===1)firstTouch=e.touches[0].clientX;},{passive:true});
  chart.addEventListener("touchend",e=>{if(firstTouch!==null&&e.changedTouches.length){const delta=e.changedTouches[0].clientX-firstTouch;if(Math.abs(delta)>50)P.shift=Math.max(-30,Math.min(40,P.shift+(delta>0?4:-4)));firstTouch=null;drawChart();}},{passive:true});
  async function loadChart(){
    if(P.loadingChart)return;
    const o=S.items.get(S.selected);
    if(!o||!S.provider){drawChart();return;}
    P.loadingChart=true;const nonce=++P.nonce,provider=S.provider,tf=P.tf;
    $("chartStatus").textContent="Mumlar yükleniyor...";
    try{
      const bars=await candles(o,tf);
      if(nonce!==P.nonce||provider!==S.provider||tf!==P.tf)return;
      const dedup=[...new Map(bars.map(b=>[b.t,b])).values()].sort((a,b)=>a.t-b.t);
      if(dedup.length<20)throw Error("En az 20 mum gerekli");
      P.bars=dedup;P.barsSymbol=o.symbol;P.barsProvider=provider;P.lastChartLoad=Date.now();
      $("chartStatus").textContent=provider+" · "+tf+" · "+dedup.length+" mum";
    }catch(e){if(nonce===P.nonce){P.bars=[];$("chartStatus").textContent="Grafik verisi yok: "+e.message;}}
    finally{P.loadingChart=false;drawChart();}
  }
  function line(ctx,points,col,w=1,opacity=1){
    ctx.strokeStyle=col;ctx.globalAlpha=opacity;ctx.lineWidth=w;ctx.beginPath();
    points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.globalAlpha=1;
  }
  function drawChart(){
    const rect=chart.getBoundingClientRect(),width=Math.max(300,rect.width),height=Math.max(250,rect.height),dpr=Math.min(devicePixelRatio||1,2);
    chart.width=Math.floor(width*dpr);chart.height=Math.floor(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle="#0a1423";ctx.fillRect(0,0,width,height);
    const o=S.items.get(S.selected);
    const padding={l:14,r:88,t:22,b:37},plotW=width-padding.l-padding.r,plotH=height-padding.t-padding.b;
    if(!P.bars.length||!o||P.barsSymbol!==o.symbol||P.barsProvider!==S.provider){
      ctx.fillStyle="#97aecb";ctx.font="13px system-ui";ctx.fillText("Seçili coin için mum verileri bekleniyor",20,70);return;
    }
    const amount=Math.min(P.bars.length,Math.max(22,65-P.shift));
    const bars=P.bars.slice(-amount),lows=bars.map(x=>x.low),highs=bars.map(x=>x.high);
    let min=Math.min(...lows),max=Math.max(...highs);
    const risk=API.plan(o),levels=[];
    if(risk&&o.sig!=="BEKLE"&&o.techAt&&Date.now()-o.techAt<10*60000&&Number.isFinite(o.stop)){
      levels.push({v:o.entry,t:"GİRİŞ",c:colors.blue},{v:o.stop,t:"STOP",c:colors.red});
      o.targets.forEach((v,i)=>levels.push({v,t:"TP"+(i+1),c:colors.green}));
    }
    const highs20=P.bars.slice(-22,-1);let support=NaN,resistance=NaN;
    if(highs20.length){support=Math.min(...highs20.map(x=>x.low));resistance=Math.max(...highs20.map(x=>x.high));}
    const lower=Math.min(min,...levels.map(x=>x.v)),upper=Math.max(max,...levels.map(x=>x.v)),pad=(upper-lower)*.09||max*.04;
    min=Math.max(0,lower-pad);max=upper+pad;
    const y=v=>padding.t+(max-v)/(max-min)*plotH;
    const step=plotW/bars.length,x=i=>padding.l+(i+.5)*step;
    for(let i=0;i<6;i++){const yy=padding.t+i*plotH/5;ctx.strokeStyle="#25364b";ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(padding.l,yy);ctx.lineTo(width-padding.r,yy);ctx.stroke();ctx.fillStyle="#819ab6";ctx.font="10px system-ui";ctx.textAlign="left";ctx.fillText(fmt(max-i*(max-min)/5),width-padding.r+6,yy+4);}
    if(Number.isFinite(support)&&Number.isFinite(resistance)){
      const span=Math.max(max-min,.000001),band=span*.005;
      for(const [v,c,label] of [[support,"rgba(52,219,172,.08)","DESTEK"],[resistance,"rgba(255,109,137,.07)","DİRENÇ"]]){
        const yy=y(v),bh=Math.max(3,Math.abs(y(v-band)-y(v+band)));
        ctx.fillStyle=c;ctx.fillRect(padding.l,yy-bh/2,plotW,bh);
        ctx.font="10px system-ui";ctx.fillStyle=label==="DESTEK"?"#3acba6":"#ff718d";ctx.textAlign="left";ctx.fillText(label,padding.l+5,yy-6);
      }
    }
    const closes=P.bars.map(b=>b.close),ema20=emaSeries(P.bars,20),ema50=emaSeries(P.bars,50),start=P.bars.length-bars.length;
    line(ctx,bars.map((_,i)=>[x(i),y(ema20[start+i])]),"#ffbb5c",1.7,.85);
    line(ctx,bars.map((_,i)=>[x(i),y(ema50[start+i])]),"#9a8bff",1.5,.85);
    ctx.strokeStyle="#26364e";ctx.beginPath();ctx.moveTo(padding.l,height-padding.b);ctx.lineTo(width-padding.r,height-padding.b);ctx.stroke();
    const bodyW=Math.max(2,Math.min(11,step*.6));
    bars.forEach((b,i)=>{const xx=x(i),up=b.close>=b.open,c=up?colors.green:colors.red;
      ctx.strokeStyle=c;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,y(b.high));ctx.lineTo(xx,y(b.low));ctx.stroke();
      const oY=y(b.open),cY=y(b.close);ctx.fillStyle=c;ctx.fillRect(xx-bodyW/2,Math.min(oY,cY),bodyW,Math.max(1.2,Math.abs(oY-cY)));
    });
    // Label each target within visible band. Targets are calculated scenarios, not forecasts.
    levels.forEach(l=>{const yy=y(l.v);if(yy<padding.t||yy>height-padding.b)return;ctx.setLineDash([5,5]);ctx.strokeStyle=l.c;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padding.l,yy);ctx.lineTo(width-padding.r,yy);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=l.c;ctx.font="bold 10px system-ui";ctx.fillText(l.t+" "+fmt(l.v),width-padding.r+5,yy-4);});
    const lastY=y(o.price);
    if(lastY>=padding.t&&lastY<=height-padding.b){ctx.strokeStyle="#64cfff";ctx.setLineDash([2,5]);ctx.beginPath();ctx.moveTo(padding.l,lastY);ctx.lineTo(width-padding.r,lastY);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#71c2ff";ctx.font="bold 10px system-ui";ctx.fillText("SON "+fmt(o.price),width-padding.r+5,lastY+12);}
    ctx.fillStyle="#8aa1bc";ctx.textAlign="center";ctx.font="10px system-ui";
    for(let i=0;i<5;i++){const ix=Math.min(bars.length-1,Math.round(i*(bars.length-1)/4));ctx.fillText(dateString(bars[ix].t).replace(",",""),x(ix),height-11);}
    if(P.hover!==null){const xpos=P.hover-rect.left,idx=Math.round((xpos-padding.l)/step-.5);if(idx>=0&&idx<bars.length){const b=bars[idx],xx=x(idx);ctx.strokeStyle="#6a8aae";ctx.lineWidth=.7;ctx.setLineDash([2,4]);ctx.beginPath();ctx.moveTo(xx,padding.t);ctx.lineTo(xx,height-padding.b);ctx.stroke();ctx.setLineDash([]);hover.textContent=dateString(b.t)+" · O "+fmt(b.open)+" H "+fmt(b.high)+" L "+fmt(b.low)+" C "+fmt(b.close)+" · Vol "+usd(b.vol);}}
    else hover.textContent="EMA20 (sarı) · EMA50 (mor) · Seçilen zaman aralığı: "+P.tf+" · Fiyat ve hedefler teyit gerektirir.";
    levelLegend.textContent="Grafik üzerindeki TP seviyeleri gelecekteki hareketi tahmin etmez; koşullu 1R / 2R / 3R hedefleridir. Kapanmamış son mum değişebilir.";
  }
  new ResizeObserver(drawChart).observe(chart);

  async function newsRefresh(){
    P.lastNewsCheck=Date.now();$("newsSource").textContent="CryptoCompare · kontrol ediliyor";
    const endpoint="https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest";
    const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),9500);
    try{
      const r=await fetch(endpoint,{signal:abort.signal,cache:"no-store"});
      if(!r.ok)throw Error("HTTP "+r.status);
      const data=await r.json();
      const list=Array.isArray(data.Data)?data.Data:[];
      const normalized=list.map(x=>({title:String(x.title||"").slice(0,250),url:String(x.url||""),source:String(x.source_info?.name||x.source||"CryptoCompare"),date:Number(x.published_on||0)*1000,categories:String(x.categories||"")})).filter(x=>{
        try{const u=new URL(x.url);return u.protocol==="https:"&&x.title.length>=10&&x.date>0&&x.date<Date.now()+300000;}catch(e){return false;}
      }).sort((a,b)=>b.date-a.date).slice(0,25);
      if(!normalized.length)throw Error("Doğrulanabilir başlık dönmedi");
      P.news=normalized;P.newsError="";P.lastNews=Date.now();
      $("newsSource").textContent="CryptoCompare · "+new Date().toLocaleTimeString("tr-TR")+" · "+normalized.length+" haber";
      renderNews();
    }catch(e){P.newsError="Bu tarayıcıdan ücretsiz haber API'sine erişilemiyor ("+e.message+"). Başlık uydurulmayacak.";$("newsSource").textContent="Haber akışı kullanılamıyor";renderNews();}
    finally{clearTimeout(timeout);}
  }
  function renderNews(){
    const wrap=$("newsFeed");wrap.replaceChildren();
    if(P.newsError){const el=document.createElement("div");el.className="newsFail";el.textContent=P.newsError;wrap.append(el);}
    else for(const n of P.news){
      const a=document.createElement("a");a.className="newsItem";a.href=n.url;a.target="_blank";a.rel="noopener noreferrer";
      const title=document.createElement("strong");title.textContent=n.title;
      const meta=document.createElement("small");meta.textContent=n.source+" · "+dateString(n.date)+(Date.now()-n.date>86400000?" · 24 saatten eski":"");
      a.append(title,meta);wrap.append(a);
    }
  }
  $("newsReload").onclick=newsRefresh;
  function market(){
    const items=[...S.items.values()],len=items.length;
    if(!len)return;
    const ups=items.filter(o=>o.change>0).length,downs=items.filter(o=>o.change<0).length;
    const btc=S.items.get("BTCUSDT"),eth=S.items.get("ETHUSDT");
    $("proBreadth").textContent=Math.round(100*ups/len)+"% yukarı";
    $("proBreadthDetail").textContent=ups+" artan / "+downs+" düşen";
    $("proBTC").textContent=btc?pc(btc.change):"—";
    $("proETH").textContent=eth?pc(eth.change):"—";
    $("proRegime").textContent=btc?(btc.change>=2?"RİSK ON":btc.change<=-2?"RİSK OFF":"KARIŞIK"):"VERİ YOK";
    $("proRegimeHint").textContent=btc?"BTC 24s hareketi / gerçek sentiment endeksi değil":"BTC verisi alınamadı";
    const cands=items.filter(x=>x.sig!=="BEKLE"&&x.techAt&&Date.now()-x.techAt<600000);
    $("proSignals").textContent=String(cands.length);
    $("proSignalsHint").textContent="Son 10 dk teknik teyitli";
    const opts=[$("chartCoin").value];
    if($("chartCoin").options.length!==len||S.provider!==$("chartCoin").dataset.provider){
      const old=S.selected;$("chartCoin").replaceChildren();
      items.sort((a,b)=>b.volume-a.volume).forEach(x=>{const opt=document.createElement("option");opt.value=x.symbol;opt.textContent=x.symbol.replace(/USDT$/,"")+" / USDT";$("chartCoin").append(opt);});
      $("chartCoin").dataset.provider=S.provider;
      $("chartCoin").value=S.items.has(old)?old:(S.items.has("BTCUSDT")?"BTCUSDT":items[0].symbol);
      if($("chartCoin").value!==S.selected)S.selected=$("chartCoin").value;
    }else if($("chartCoin").value!==S.selected)$("chartCoin").value=S.selected;
    renderAnalysis();
  }
  function renderAnalysis(){
    const o=S.items.get(S.selected);if(!o)return;
    $("analysisTitle").textContent=o.symbol+" / USDT";
    const pl=plan(o),stale=!o.techAt||Date.now()-o.techAt>600000;
    const valid=!!pl&&!stale&&S.connected&&o.sig!=="BEKLE";
    $("analysisSignal").textContent=valid?o.sig:"BEKLE";
    $("analysisSignal").className="signalbig "+(valid?(o.sig.startsWith("AL")?"buy":"sell"):"wait");
    $("analysisPrice").textContent=fmt(o.price)+" USDT";
    $("analysisExplain").textContent=stale?"Güncel 4H/1H/15M teyidi bekleniyor. Önce grafik ve mum verileri yüklenmeli.":o.why;
    $("analysisScore").textContent=baseScore(o)+"/100 · sıralama puanı, olasılık değil";
    const fields=[
      ["Fiyat / piyasa",fmt(o.price)+" · "+S.provider],
      ["Giriş",valid?fmt(o.entry):"BEKLE"],
      ["Stop / geçersizlik",valid?fmt(o.stop):"—"],
      ["Hedef 1 · 1R",valid?fmt(o.targets[0]):"—"],
      ["Hedef 2 · 2R",valid?fmt(o.targets[1]):"—"],
      ["Hedef 3 · 3R",valid?fmt(o.targets[2]):"—"],
      ["10x brüt ROI / TP3",valid?"+"+(pl.stopPercent*3*10).toFixed(1)+"%":"—"],
      ["Teminat · seçilen kaldıraç",valid?money(pl.margin):"—"],
      ["Pozisyon nominal",valid?money(pl.notional):"—"],
      ["Stopta planlı kayıp",valid?money(pl.loss):"—"],
      ["Risk sınıfı",valid?pl.risk:"—"],
      ["1H RSI",Number.isFinite(o.rsi)?o.rsi.toFixed(1):"—"],
      ["Funding",Number.isFinite(o.funding)?pc(o.funding*100):"Veri yok"],
      ["OI",Number.isFinite(o.oi)?usd(o.oi):"Veri yok"],
      ["OI değişim (ölçüldüyse)",Number.isFinite(o.oiDelta)?pc(o.oiDelta):"Henüz yok"]
    ];
    $("analysisRows").innerHTML=fields.map(([k,v])=>'<div class="analysisRow"><span>'+safe(k)+'</span><b>'+safe(v)+'</b></div>').join("");
    $("paperOpen").disabled=!valid;
    $("paperOpen").textContent=valid?"Bu sinyali SANAL aç":"Sinyal teyidi bekleniyor";
  }
  $("manualAlertSymbol").onchange=renderCustom;
  $("customAlertAdd").onclick=()=>{
    const sym=$("chartCoin").value,o=S.items.get(sym),price=Number($("customAlertPrice").value);
    const dir=$("customAlertDir").value;
    if(!o||!Number.isFinite(price)||price<=0){event("Geçerli bir fiyat gir.","bad");return;}
    const id=Date.now()+"-"+sym;
    P.custom.push({id,sym,price,dir,fired:false,created:Date.now()});
    store();renderCustom();event(sym+" fiyat alarmı kaydedildi.","ok");
  };
  function renderCustom(){
    const list=$("customAlertList");list.innerHTML=P.custom.length?P.custom.map(x=>'<div class="customAlarm"><span>'+safe(x.sym)+' '+(x.dir==="above"?"≥":"≤")+" "+fmt(x.price)+(x.fired?" · tetiklendi":"")+'</span><button data-alarm-remove="'+safe(x.id)+'" title="Alarmı sil">✕</button></div>').join(""):'<span class="proMuted">Henüz özel fiyat alarmı yok.</span>';
  }
  document.addEventListener("click",e=>{const t=e.target.closest("[data-alarm-remove]");if(!t)return;P.custom=P.custom.filter(x=>x.id!==t.dataset.alarmRemove);store();renderCustom();});
  function customCheck(){
    if(!S.connected||!S.lastTick||Date.now()-S.lastTick>30000)return;
    let changed=false;
    for(const a of P.custom){if(a.fired)continue;const o=S.items.get(a.sym);if(!o)continue;if((a.dir==="above"&&o.price>=a.price)||(a.dir==="below"&&o.price<=a.price)){
      a.fired=true;changed=true;const msg="Özel fiyat alarmı: "+a.sym+" "+(a.dir==="above"?"üzeri":"altı")+" "+fmt(a.price)+" · anlık "+fmt(o.price);
      if("Notification" in window&&Notification.permission==="granted"&&document.visibilityState==="visible"){try{new Notification("COIN.LIVE",{body:msg});}catch(e){}}
      if(S.sound&&S.audio){try{const osc=S.audio.createOscillator(),g=S.audio.createGain();osc.frequency.value=590;g.gain.value=.08;osc.connect(g).connect(S.audio.destination);osc.start();osc.stop(S.audio.currentTime+.25);}catch(e){}}
      event(msg,"ok");
    }}
    if(changed){store();renderCustom();}
  }

  // Paper engine: isolated risk sizing, modeled fees, stop priority and conservative slippage.
  const paper=P.paper;
  function record(label,pnl=0){paper.events.unshift({time:Date.now(),label,pnl,balance:paper.balance});paper.events.length=Math.min(paper.events.length,150);}
  function todayGuard(){const day=localDay();if(day!==paper.day){paper.day=day;paper.dayLoss=0;paper.dayStart=paper.balance;}}
  function paperEntry(){
    todayGuard();const o=S.items.get(S.selected),pl=plan(o);
    if(paper.active){event("Tek aktif sanal işlem sınırı var. Önce mevcut işlemi kapat.","bad");return;}
    if(paper.paused||paper.lossStreak>=2){event("İki ardışık kayıptan sonra sistem durdu. Oturumu manuel sıfırlayabilirsin.","bad");return;}
    if(paper.dayLoss< -Math.max(1,paper.dayStart)*.05){event("Günlük %5 kayıp sınırı aşıldı.","bad");return;}
    if(!o||!pl||o.sig==="BEKLE"||!S.connected||Date.now()-o.techAt>600000){event("Teyitli ve güncel bir sinyal olmadan sanal pozisyon açılmaz.","bad");return;}
    const entry=o.price,side=o.sig==="AL (LONG)"?1:-1;
    const dist=Math.abs(o.entry-o.stop),stop=entry-side*dist;
    if(!Number.isFinite(stop)||stop<=0){event("Stop seviyesi geçersiz.","bad");return;}
    const stopRate=dist/entry,balance=paper.balance,leverage=Math.min(15,Math.max(1,number($("lev").value,10)));
    const risk=Math.min(.03,Math.max(.005,number($("risk").value,2)/100));
    const notional=Math.min(balance*risk/stopRate,balance*.3*leverage);
    const margin=notional/leverage,entryFee=notional*.0004;
    if(!(notional>0)&&!(margin>0)){event("Pozisyon büyüklüğü hesaplanamıyor.","bad");return;}
    if(margin+entryFee>balance){event("Yetersiz sanal bakiye.","bad");return;}
    const qty=notional/entry;
    paper.balance-=entryFee;
    paper.active={symbol:o.symbol,provider:S.provider,side,entry,stop,initialStop:stop,targets:[entry+side*dist,entry+side*dist*2,entry+side*dist*3],qty,remaining:qty,margin,lev:leverage,tp:0,net:-entryFee,openAt:Date.now(),fees:entryFee};
    record("SANAL AÇ "+o.symbol+" "+(side>0?"LONG":"SHORT")+" "+leverage+"x / "+fmt(entry),-entryFee);
    store();paperRender();event("Sanal işlem açıldı. Gerçek borsaya emir gönderilmedi.","ok");
  }
  function paperExit(price,amount,reason){
    const a=paper.active;if(!a||amount<=0)return;
    const fill=price,fee=fill*amount*.0004;
    const pnl=(fill-a.entry)*a.side*amount-fee;
    paper.balance+=pnl;a.net+=pnl;a.fees+=fee;a.remaining=Math.max(0,a.remaining-amount);
    paper.dayLoss+=Math.min(0,pnl);
    record(a.symbol+" "+reason+" / "+fmt(fill),pnl);
    if(a.remaining<=a.qty*.000001){
      if(a.net<0)paper.lossStreak++;else paper.lossStreak=0;
      if(paper.lossStreak>=2)paper.paused=true;
      record("POZİSYON KAPANDI · net "+money(a.net),0);paper.active=null;
    }
    store();
  }
  function paperTick(){
    todayGuard();const a=paper.active;if(!a)return;const o=S.items.get(a.symbol);
    if(!o||S.provider!==a.provider||!S.connected||Date.now()-S.lastTick>30000){paperRender();return;}
    const price=o.price;if(!(price>0))return;
    const breached=a.side>0?price<=a.stop:price>=a.stop;
    // Bad execution prioritized; stop uses observed price, not an idealized stop price.
    if(breached){paperExit(price,a.remaining,"STOP / güncel fiyat");paperRender();return;}
    for(let i=a.tp;i<3;i++){const hit=a.side>0?price>=a.targets[i]:price<=a.targets[i];if(!hit)break;
      const q=i===2?a.remaining:Math.min(a.remaining,a.qty/3);
      paperExit(a.targets[i],q,"TP"+(i+1));
      if(!paper.active)break;
      a.tp=i+1;if(i===0)a.stop=a.entry;
    }
    paperRender();
  }
  function closePaper(){
    const a=paper.active;if(!a)return;const o=S.items.get(a.symbol);
    if(!o||S.provider!==a.provider||!S.connected||Date.now()-S.lastTick>30000){event("Güncel fiyat veya aynı borsa verisi yok. Sanal çıkış donduruldu.","bad");return;}
    paperExit(o.price,a.remaining,"MANUEL KAPAT");paperRender();event("Sanal işlem kapandı.","ok");
  }
  function paperRender(){
    const a=paper.active,o=a&&S.items.get(a.symbol),pnl=a&&o&&o.price>0?(o.price-a.entry)*a.side*a.remaining-a.remaining*o.price*.0004:0;
    $("paperBalance").textContent=money(paper.balance);
    $("paperEquity").textContent=money(paper.balance+pnl);
    $("paperStreak").textContent=String(paper.lossStreak)+"/2";
    $("paperOpen").disabled=!!a||paper.paused;
    $("paperClose").disabled=!a;
    $("paperTrade").innerHTML=a?'<strong>'+safe(a.symbol)+' · '+(a.side>0?"LONG":"SHORT")+' '+a.lev+'x</strong><div class="analysisRow"><span>Giriş</span><b>'+fmt(a.entry)+'</b></div><div class="analysisRow"><span>Anlık / paper</span><b>'+(o?fmt(o.price):"—")+'</b></div><div class="analysisRow"><span>Kalan nominal</span><b>'+usd(a.remaining*a.entry)+'</b></div><div class="analysisRow"><span>Stop</span><b>'+fmt(a.stop)+'</b></div><div class="analysisRow"><span>Hedef</span><b>'+a.targets.map(fmt).join(" / ")+'</b></div><div class="analysisRow"><span>Gerçekleşmemiş PnL (tahmini)</span><b class="'+(pnl>=0?"green":"red")+'">'+money(pnl)+'</b></div>':'Sanal pozisyon açık değil. AL/SAT sinyalli coin seçerek risk sınırı içinde örnek pozisyon başlat.';
    $("paperLog").innerHTML=paper.events.length?paper.events.slice(0,24).map(e=>'<div class="analysisRow"><span>'+safe(dateString(e.time)+" · "+e.label)+'</span><b class="'+(e.pnl>=0?"green":"red")+'">'+money(e.pnl)+'</b></div>').join(""):'<span class="proMuted">İşlem kaydı henüz yok.</span>';
    $("paperGuard").textContent=paper.paused?"DURDURULDU: 2 ardışık kayıp":"Tek pozisyon · %2 varsayılan risk · günlük %5 limit · 0,04% taker komisyon/yan (model)";
  }
  $("paperOpen").onclick=paperEntry;$("paperClose").onclick=closePaper;
  $("paperReset").onclick=()=>{
    if(!confirm("Sanal bakiyeyi 100 USDT'ye sıfırla ve geçmişi sil? Gerçek hesap etkilenmez."))return;
    Object.assign(paper,{balance:100,initial:100,events:[],active:null,lossStreak:0,paused:false,day:localDay(),dayLoss:0,dayStart:100});
    store();paperRender();event("Sanal hesap sıfırlandı.","ok");
  };
  $("paperExport").onclick=()=>{
    const head="Zaman,Etkinlik,PnL_USDT,Bakiye_USDT\n";
    const rows=paper.events.slice().reverse().map(e=>[new Date(e.time).toISOString(),'"'+String(e.label).replace(/"/g,'""')+'"',number(e.pnl).toFixed(6),number(e.balance).toFixed(6)].join(",")).join("\n");
    const blob=new Blob(["\ufeff"+head+rows],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="coin-live-sanal-islem.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
  // Initial page and data-source changes. Charts refreshed without hammering free APIs.
  function tick(){
    const stamp=Date.now();if(S.items.size&&S.provider){
      market();customCheck();paperTick();
      if(P.barsSymbol!==S.selected||P.barsProvider!==S.provider)loadChart();
      else if(stamp-P.lastChartLoad>180000&&!P.loadingChart)loadChart();
      else if(stamp-P.lastRender>2200)drawChart();
      if(stamp-P.lastRender>2200)P.lastRender=stamp;
    }
  }
  paperRender();renderCustom();newsRefresh();setInterval(newsRefresh,300000);setInterval(tick,2500);setTimeout(tick,650);
})();
