"use strict";
(() => {
 const $=id=>document.getElementById(id),OKX="https://www.okx.com",HL="https://api.hyperliquid.xyz/info";
 const S={market:[],signalSet:[],bySymbol:new Map(),prices:new Map(),provider:"",source:"",marketStamp:0,signalStamp:0,
  live:false,lastLive:0,lastRender:0,news:[],balance:100,sound:false,ctx:null,lastAlarms:new Map(),priceHistory:new Map(),
  firstPaint:true,boot:Date.now(),quote:"USDT",newsFetched:0,directRunning:false,directFails:0,liveTimer:null,refreshTimer:null,chosen:null};
 try{const b=Number(localStorage.getItem("coinlive.balance"));if(b>=10&&b<=1e6)S.balance=b;}catch(e){}
 $("balanceInput").value=S.balance;
 const numeric=x=>x===null||x===undefined||x===""?NaN:Number(x);
 const valid=x=>Number.isFinite(x)&&x>0;
 const fmt=x=>!Number.isFinite(x)?"—":x>=1000?x.toLocaleString("en-US",{maximumFractionDigits:2}):x>=1?x.toFixed(3):x>=.01?x.toFixed(5):x.toFixed(8);
 const pct=x=>!Number.isFinite(x)?"—":(x>=0?"+":"")+x.toFixed(2)+"%";
 const money=x=>Number.isFinite(x)?"$"+x.toFixed(2):"—";
 const compact=x=>!Number.isFinite(x)?"—":x>=1e9?"$"+(x/1e9).toFixed(2)+"B":x>=1e6?"$"+(x/1e6).toFixed(1)+"M":x>=1e3?"$"+(x/1e3).toFixed(1)+"K":money(x);
 const escape=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const dtime=ms=>new Date(ms).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit"});
 const dLong=ms=>new Date(ms).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
 const age=ms=>Math.max(0,Math.round((Date.now()-ms)/60000));
 function error(t){$("error").textContent=t||"";$("error").style.display=t?"block":"none";}
 function connection(label,mode="backup"){
   $("connection").textContent=label;
   $("statusDot").className="dot "+(mode==="live"?"live":mode==="backup"?"backup":"");
 }
 async function request(url,body=null,timeoutMs=9000){
   const abort=new AbortController(),id=setTimeout(()=>abort.abort(),timeoutMs);
   try{
    const r=await fetch(url,{method:body?"POST":"GET",body:body?JSON.stringify(body):undefined,headers:body?{"Content-Type":"application/json"}:{},cache:"no-store",signal:abort.signal});
    if(!r.ok)throw Error("HTTP "+r.status);
    return await r.json();
   }finally{clearTimeout(id);}
 }
 function mapOkx(d){
   if(d.code!=="0"||!Array.isArray(d.data))throw Error("OKX verisi hatalı");
   return d.data.filter(x=>/^[A-Z0-9]+-USDT-SWAP$/.test(x.instId)).map(x=>{
    const p=numeric(x.last),prev=numeric(x.open24h),vol=numeric(x.volCcyQuote24h),baseVol=numeric(x.volCcy24h);
    return {symbol:x.instId.replace(/-USDT-SWAP$/,"USDT"),quote:"USDT",price:p,change:valid(prev)?(p/prev-1)*100:NaN,volume:valid(vol)?vol:baseVol*p};
   }).filter(x=>valid(x.price)&&valid(x.volume)).sort((a,b)=>b.volume-a.volume).slice(0,100);
 }
 function mapHyper(d){
   if(!Array.isArray(d)||!Array.isArray(d[0]?.universe)||!Array.isArray(d[1]))throw Error("Hyperliquid geçersiz");
   return d[0].universe.map((m,i)=>{
    const x=d[1][i]||{},coin=m.name||"",p=numeric(x.markPx||x.midPx),prev=numeric(x.prevDayPx);
    return {symbol:coin+"USDT",quote:"USDC",price:p,change:valid(prev)?(p/prev-1)*100:NaN,volume:numeric(x.dayNtlVlm)};
   }).filter(x=>/^[A-Z0-9]{2,25}USDT$/.test(x.symbol)&&valid(x.price)&&valid(x.volume))
    .sort((a,b)=>b.volume-a.volume).slice(0,100);
 }
 function normalize(rows){return rows.filter(x=>x&&valid(Number(x.price))&&valid(Number(x.volume))&&/^[A-Z0-9]+USDT$/.test(x.symbol||"")).slice(0,100)
  .map(x=>({symbol:x.symbol,price:+x.price,change:numeric(x.change),volume:+x.volume,quote:x.quote||"USDT"}));}
 function setMarket(rows,source,provider,stamp,live){
   const cleaned=normalize(rows);if(cleaned.length<20)throw Error("Güvenilir 20 coin bulunamadı");
   S.market=cleaned;S.prices=new Map(cleaned.map(x=>[x.symbol,x]));
   S.source=source;S.provider=provider;S.marketStamp=stamp;S.live=live;S.lastLive=live?Date.now():0;
   S.quote=cleaned[0].quote||"USDT";
   render();
 }
 async function loadSnapshots(){
   let market=null,signals=null,marketErr=null,signalErr=null;
   const results=await Promise.allSettled([request("./market-snapshot.json?t="+Date.now()),
       request("./signals-snapshot.json?t="+Date.now())]);
   if(results[0].status==="fulfilled")market=results[0].value;else marketErr=results[0].reason?.message||"Fiyat dosyası okunamadı";
   if(results[1].status==="fulfilled")signals=results[1].value;else signalErr=results[1].reason?.message||"Analiz dosyası henüz yok";
   if(market?.rows?.length){
      const stamp=Date.parse(market.fetched_at);
      if(!S.live)try{setMarket(market.rows,"YEDEK",market.provider,stamp,false);}catch(e){marketErr=e.message;}
   }
   if(Array.isArray(signals?.signals)){
      const stamp=Date.parse(signals.fetched_at);
      S.signalStamp=Number.isFinite(stamp)?stamp:0;
      S.signalProvider=signals.provider||"";
      S.signalSet=signals.signals;
      S.bySymbol=new Map(S.signalSet.map(x=>[x.symbol,x]));
      $("analyzedCount").textContent=String(signals.analyzed||0);
      render();
   }else if(signalErr){$("analyzedCount").textContent="—";}
   if(!S.market.length)error("Fiyat kaynağına erişilemiyor: "+(marketErr||"Borsa verisi yok")+".");
   else if(age(S.marketStamp)>30&&!S.live)error("Fiyat yedeği 30 dakikadan eski. İşlem sinyalleri kapalı.");
   else error("");
 }
 function isReady(s){
   if(!s||!(s.signal==="AL"||s.signal==="SAT")||!valid(s.entry)||!valid(s.stop)||!Array.isArray(s.targets)||s.targets.length!==3)return false;
   if(!S.market.length||!Number.isFinite(S.signalStamp)||S.signalStamp<=0)return false;
   if(Date.now()-S.signalStamp>15*60000||Date.now()-S.marketStamp>30*60000)return false;
   if(S.provider!==S.signalProvider)return false;
   const m=S.prices.get(s.symbol);if(!m||m.quote!==(s.quote||"USDT"))return false;
   const stopPct=Math.abs(s.entry-s.stop)/s.entry;
   if(!Number.isFinite(stopPct)||stopPct<.003||stopPct>.055)return false;
   // A strong breakout that has already run too far is not a fresh entry.
   const priceGap=Math.abs(m.price-s.entry)/s.entry;
   if(priceGap>Math.min(.012,stopPct*.38))return false;
   // Do not present a signal if its stop was crossed by the current quote.
   if(s.signal==="AL"&&m.price<=s.stop)return false;
   if(s.signal==="SAT"&&m.price>=s.stop)return false;
   return true;
 }
 function score(s){
   const value=numeric(s?.score);return Number.isFinite(value)?Math.max(0,Math.min(100,value)):0;
 }
 function rankedSignals(){
   return S.signalSet.filter(x=>S.prices.has(x.symbol)&&score(x)>0).sort((a,b)=>{
     const aReady=isReady(a)?1:0,bReady=isReady(b)?1:0;
     return bReady-aReady||score(b)-score(a);
   });
 }
 function risk(s){
   if(!s||!isReady(s))return null;
   const m=S.prices.get(s.symbol),stopDist=Math.abs(s.entry-s.stop)/s.entry;
   const riskClass=stopDist>.03||m.volume<3e7?"ÇOK YÜKSEK":stopDist>.018||m.volume<1.5e8?"YÜKSEK":"ORTA-YÜKSEK";
   const perTrade=riskClass==="ÇOK YÜKSEK"?.005:riskClass==="YÜKSEK"?.01:.02;
   const notional=Math.min(S.balance*perTrade/stopDist,S.balance*10*.25);
   return {class:riskClass,perTrade,notional,margin:notional/10,
     loss:notional*stopDist,stopPct:stopDist*100,
     roi:s.targets.map((t,i)=>((Math.abs(t-s.entry)/s.entry)*10*100)),
     expectedPnL:s.targets.map(t=>notional*Math.abs(t-s.entry)/s.entry)};
 }
 function mainPick(){
   return rankedSignals().find(isReady)||null;
 }
 function watchPicks(){
   return rankedSignals().filter(x=>!isReady(x)).slice(0,6);
 }
 function selected(){
   const signal=mainPick();return signal||rankedSignals()[0]||null;
 }
 function mkLevel(title,value,kind=""){
   return '<div class="level '+kind+'"><small>'+title+'</small><b>'+escape(value)+'</b></div>';
 }
 function renderHero(){
   const s=mainPick(),a=selected();S.chosen=a;
   $("activeSignals").textContent=rankedSignals().filter(isReady).length;
   $("verdictKicker").textContent=s?"TEYİTLİ SİNYAL · İŞLEM SENARYOSU":"GÜNCEL KARAR · UYGUN TEYİT YOK";
   $("decisionTime").textContent=S.signalStamp?"Analiz: "+dLong(S.signalStamp)+" · Kaynak: "+escape(S.signalProvider||"—"):"Analiz verisi bekleniyor";
   const title=$("verdictHeadline");
   if(!s){
      title.textContent="BEKLE";
      title.className="wait";
      let reason="15M giriş + 1H momentum + 4H trend birlikte doğrulanmadı; zorla işlem açma.";
      if(!S.signalSet.length)reason="Teknik veri henüz gelmedi. Kapanmış mumlar analiz edilene kadar sinyal önerilmiyor.";
      else if(age(S.signalStamp)>15)reason="Analiz 15 dakikadan eski. Yeni mum teyidi gelmeden alım/satım yapılmamalı.";
      else if(S.provider!==S.signalProvider)reason="Fiyat ve teknik sinyal farklı borsalardan geliyor; güvenilir işlem yönü oluşana kadar BEKLE.";
      $("verdictReason").textContent=reason;
      $("verdictTags").innerHTML='<span class="chip wait">AL/SAT TETİĞİ YOK</span><span class="chip wait">10x varsayılan · nakitte bekle</span>';
      $("levels").innerHTML=mkLevel("GİRİŞ","YOK")+mkLevel("STOP","—")+mkLevel("HEDEF 1","—")+mkLevel("HEDEF 2","—")+mkLevel("HEDEF 3","—")+mkLevel("ÖNERİLEN TEMİNAT","0 USDT");
   }else{
      const m=S.prices.get(s.symbol),r=risk(s),long=s.signal==="AL",name=s.symbol.replace(/USDT$/,"");
      title.textContent=name+" · "+(long?"AL / LONG":"SAT / SHORT");title.className=long?"long":"short";
      $("verdictReason").textContent=s.why+" · 10x izole örnek · pozisyon stopa göre boyutlandırıldı. Giriş emri otomatik gönderilmez.";
      $("verdictTags").innerHTML='<span class="chip '+(long?"long":"short")+'">'+(long?"LONG":"SHORT")+'</span><span class="chip wait">Risk '+escape(r.class)+'</span><span class="chip wait">1:3 risk/getiri</span>';
      $("levels").innerHTML=mkLevel("GİRİŞ FİYATI",fmt(m.price),"blue")+mkLevel("STOP",fmt(s.stop),"bad")+mkLevel("HEDEF 1",fmt(s.targets[0]),"good")+mkLevel("HEDEF 2",fmt(s.targets[1]),"good")+mkLevel("HEDEF 3",fmt(s.targets[2]),"good")+mkLevel("TEMİNAT · 10x",r.margin.toFixed(2)+" USDT","yellow");
   }
   renderRisk(s);
 }
 function renderRisk(s){
   const rows=s?(()=>{
     const r=risk(s);
     return [["Varsayılan bakiye",money(S.balance)],["Risk sınıfı",r.class],["Hesap risk yüzdesi","%"+(r.perTrade*100).toFixed(1)],
       ["Kullanılacak teminat",money(r.margin)],["10x pozisyon",money(r.notional)],
       ["Stopta brüt kayıp",money(r.loss)],["Hedef 1 brüt kazanç",money(r.expectedPnL[0])],
       ["Hedef 2 brüt kazanç",money(r.expectedPnL[1])],["Hedef 3 brüt kazanç",money(r.expectedPnL[2])],
       ["Kaldıraç sonrası TP3 (brüt)","+"+r.roi[2].toFixed(1)+"%"]];
   })():[["Varsayılan bakiye",money(S.balance)],["Risk limiti","Sinyale göre %0,5–2"],["Kaldıraç","10x, izole model"],
     ["Teminat","0 USDT · BEKLE"],["Pozisyon","AÇMA"],["Maks. teminat sınırı",money(S.balance*.25)]];
   $("riskBreakdown").innerHTML=rows.map(([k,v])=>'<div class="detailRow"><span>'+escape(k)+'</span><b>'+escape(v)+'</b></div>').join("");
   $("calculatorResult").innerHTML=$("riskBreakdown").innerHTML;
 }
 function renderTop(){
   const candidates=rankedSignals().slice(0,5);
   $("topCandidates").innerHTML=candidates.length?candidates.map((s,i)=>{
    const m=S.prices.get(s.symbol),ready=isReady(s),tag=ready?s.signal:"İZLE",tagclass=ready?(s.signal==="AL"?"long":"short"):"wait";
    return '<div class="rank"><div class="rankNum">'+(i+1)+'</div><div><div class="rankSymbol">'+escape(s.symbol.replace(/USDT$/,""))+' / '+escape(m.quote)+'</div><div class="rankSub">'+escape(ready?"15M+1H+4H teyitli":s.why||"Erken aday · bekle")+'</div></div><div class="rankRight"><strong class="'+(m.change>=0?"green":"red")+'">'+pct(m.change)+'</strong><span class="chip '+tagclass+'">'+tag+'</span> <span class="score">'+score(s)+'/100</span></div></div>';
   }).join(""):'<div class="newsEmpty">Sunucunun kapanmış mum analizini bekliyoruz. Coinler radar tabelasında gösterilmeye devam eder.</div>';
 }
 function renderEarly(){
   const list=watchPicks().slice(0,5);
   $("earlyWatch").innerHTML=list.length?list.map(s=>{
    const m=S.prices.get(s.symbol),bb=Number.isFinite(+s.bb_width)?s.bb_width+"%":"—",v=Number.isFinite(+s.vol_ratio)?s.vol_ratio+"x":"—";
    return '<div class="rank"><div class="rankNum">🌋</div><div><div class="rankSymbol">'+escape(s.symbol.replace(/USDT$/,""))+'</div><div class="rankSub">15M hacim '+escape(v)+' · BB '+escape(bb)+'</div></div><div class="rankRight"><strong class="'+(m.change>=0?"green":"red")+'">'+pct(m.change)+'</strong><span class="chip wait">BEKLE</span> <span class="score">'+score(s)+'</span></div></div>';
   }).join(""):'<div class="newsEmpty">Teyitsiz yanardağ adayı bulunamadı. Hareket sonrası coin kovalanmıyor.</div>';
 }
 function renderTable(){
   const sorted=S.market.slice().sort((a,b)=>{
    const x=S.bySymbol.get(a.symbol),y=S.bySymbol.get(b.symbol),sx=isReady(x)?1:0,sy=isReady(y)?1:0;
    return sy-sx||score(y)-score(x)||b.volume-a.volume;
   });
   $("rows").innerHTML=sorted.length?sorted.map((m,i)=>{
    const s=S.bySymbol.get(m.symbol),ready=isReady(s),status=ready?s.signal:s?"İZLE":"TARAMA";
    return '<tr><td class="grey">'+(i+1)+'</td><td class="sym">'+escape(m.symbol.replace(/USDT$/,""))+'<span class="grey"> / '+escape(m.quote)+'</span></td><td>'+fmt(m.price)+'</td><td class="'+(m.change>=0?"green":"red")+'">'+pct(m.change)+'</td><td>'+compact(m.volume)+'</td><td class="blue">'+(s?score(s)+'/100':"—")+'</td><td><span class="chip '+(ready?(s.signal==="AL"?"long":"short"):"wait")+'">'+status+'</span></td></tr>';
   }).join(""):'<tr><td colspan="7" class="newsEmpty">Fiyat verisi henüz gelmedi.</td></tr>';
 }
 function render(){
   $("count").textContent=S.market.length;
   const marketAge=age(S.marketStamp),isRecent=S.live&&Date.now()-S.lastLive<45000;
   if(isRecent)connection("● CANLI • "+S.provider,"live");
   else if(S.market.length)connection("● YEDEK "+marketAge+" DK","backup");
   else connection("● VERİ YOK","error");
   $("sourceName").textContent=S.market.length?(isRecent?"Doğrudan "+S.provider:S.provider+" veri yedeği · "+marketAge+" dk"):"Bağlanıyor";
   $("updated").textContent=S.market.length?dtime(S.marketStamp):"—";
   $("proBTC").textContent=pct(S.prices.get("BTCUSDT")?.change);
   renderHero();renderTop();renderEarly();renderTable();draw();
 }
 function candleDraw(){
   const canvas=$("chart"),ctx=canvas.getContext("2d"),r=canvas.getBoundingClientRect(),w=Math.max(r.width,310),h=Math.max(r.height,240),dpr=Math.min(devicePixelRatio||1,2);
   canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#0b1423";ctx.fillRect(0,0,w,h);
   const s=S.chosen,m=s&&S.prices.get(s.symbol),raw=s?.candles_15m;
   if(!Array.isArray(raw)||raw.length<18||!m){
     ctx.font="13px system-ui";ctx.fillStyle="#97afca";ctx.fillText("Grafik için mum verisi bekleniyor",20,50);
     return;
   }
   const bars=raw.slice(-54).map(v=>({t:+v[0],o:+v[1],h:+v[2],l:+v[3],c:+v[4]}));
   const pad={l:12,r:93,t:19,b:26},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
   let lo=Math.min(...bars.map(x=>x.l)),hi=Math.max(...bars.map(x=>x.h)),levels=[];
   const ready=isReady(s);if(ready){
     levels=[{value:s.entry,label:"GİRİŞ",color:"#74beff"},{value:s.stop,label:"STOP",color:"#ff7089"},...s.targets.map((value,i)=>({value,label:"TP"+(i+1),color:"#36dbab"}))];
   }
   if(levels.length){lo=Math.min(lo,...levels.map(x=>x.value));hi=Math.max(hi,...levels.map(x=>x.value));}
   const padding=Math.max((hi-lo)*.1,lo*.003);lo-=padding;hi+=padding;
   const Y=v=>pad.t+(hi-v)/(hi-lo)*ph,X=i=>pad.l+(i+.5)*pw/bars.length;
   ctx.font="10px system-ui";
   for(let i=0;i<=5;i++){const y=pad.t+ph*i/5;ctx.strokeStyle="#273951";ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillStyle="#8eabc9";ctx.fillText(fmt(hi-(hi-lo)*i/5),w-pad.r+5,y+4);}
   const recent=bars.slice(-20),sup=Math.min(...recent.map(x=>x.l)),res=Math.max(...recent.map(x=>x.h));
   for(const [z,c,t] of [[sup,"#30b497","DESTEK"],[res,"#dd7d88","DİRENÇ"]]){
     const y=Y(z);ctx.strokeStyle=c;ctx.setLineDash([2,7]);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=c;ctx.fillText(t,pad.l+5,Math.max(12,y-7));
   }
   const bw=Math.max(2,Math.min(9,pw/bars.length*.6));
   bars.forEach((b,i)=>{const x=X(i),color=b.c>=b.o?"#30d5a4":"#fa718a";ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(x,Y(b.h));ctx.lineTo(x,Y(b.l));ctx.stroke();ctx.fillStyle=color;ctx.fillRect(x-bw/2,Math.min(Y(b.o),Y(b.c)),bw,Math.max(1.5,Math.abs(Y(b.c)-Y(b.o))));});
   for(const l of levels){const y=Y(l.value);if(y<pad.t||y>h-pad.b)continue;ctx.strokeStyle=l.color;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.setLineDash([]);ctx.font="bold 10px system-ui";ctx.fillStyle=l.color;ctx.fillText(l.label+" "+fmt(l.value),w-pad.r+4,y-4);}
   ctx.fillStyle="#95aac4";ctx.font="10px system-ui";
   for(let i=0;i<4;i++){const idx=Math.round((bars.length-1)*i/3);ctx.fillText(dtime(bars[idx].t),X(idx)-14,h-9);}
 }
 let renderTimer=0;function draw(){
   const s=S.chosen;
   $("chartTitle").textContent=s?"📊 "+s.symbol.replace(/USDT$/,"")+" / "+(S.prices.get(s.symbol)?.quote||"USDT")+" · OTOMATİK GRAFİK":"📊 Otomatik Grafik";
   $("chartStatus").textContent=s?("15 dakikalık kapanmış mumlar · "+(isReady(s)?"Koşullu giriş/stop/hedef gösteriliyor":"Destek/direnç izleniyor")):"Analiz dosyası bekleniyor";
   $("chartCaption").textContent=isReady(s)?"Stop ve hedefler matematiksel senaryodur. Gerçek fiyat, kayma, ücret ve likidasyon ayrıdır.":"Teyitli işlem yok. Grafikteki destek/direnç geçmiş fiyatların bölgesidir; gelecek fiyat garantisi değildir.";
   clearTimeout(renderTimer);renderTimer=setTimeout(candleDraw,70);
 }
 async function direct(){
   if(S.directRunning)return;S.directRunning=true;
   const sources=[["OKX",async()=>mapOkx(await request(OKX+"/api/v5/market/tickers?instType=SWAP"))],
     ["Hyperliquid",async()=>mapHyper(await request(HL,{type:"metaAndAssetCtxs"}))]];
   let success=false,errors=[];
   for(const [name,fn] of sources){try{
     const rows=await fn();if(rows.length<20)throw Error("Az coin");
     setMarket(rows,"CANLI",name,Date.now(),true);S.directFails=0;success=true;break;
   }catch(e){errors.push(name+" "+e.message);}}
   S.directRunning=false;
   if(!success){S.directFails++;S.live=false;
     if(S.market.length)connection("● YEDEK "+age(S.marketStamp)+" DK","backup");
     else error("API ve veri yedeği kullanılamıyor: "+errors.join(" | "));
   }
 }
 async function poll(){
   if(S.directRunning)return;
   if(S.live){
    try{const rows=S.provider==="OKX"?mapOkx(await request(OKX+"/api/v5/market/tickers?instType=SWAP")):mapHyper(await request(HL,{type:"metaAndAssetCtxs"}));
      if(rows.length<20)throw Error("Az coin");
      setMarket(rows,"CANLI",S.provider,Date.now(),true);track();
    }catch(e){S.directFails++;if(S.directFails>=2){S.live=false;await loadSnapshots();await direct();}else connection("CANLI BAĞLANTI KONTROL","backup");}
   }else{await loadSnapshots();if(Date.now()-S.lastLive>60000)await direct();}
 }
 function track(){
   if(!S.live)return;
   const t=Date.now();for(const m of S.market){
    const hist=S.priceHistory.get(m.symbol)||[];if(!hist.length||t-hist[hist.length-1][0]>12000)hist.push([t,m.price]);
    while(hist.length>1&&hist[1][0]<t-300000)hist.shift();
    S.priceHistory.set(m.symbol,hist);
    if(hist.length<2||t-hist[0][0]<270000)continue;
    const diff=(m.price/hist[0][1]-1)*100;
    if(Math.abs(diff)>=4&&m.volume>=50000000)notify("hareket-"+m.symbol,m.symbol+" · "+pct(diff)+" / 5 dk · "+S.provider);
   }
   for(const s of rankedSignals())if(isReady(s)&&!S.firstPaint)notify("signal-"+s.symbol+"-"+s.signal,s.symbol+" · "+s.signal+" sinyali · stop "+fmt(s.stop));
   S.firstPaint=false;
 }
 function notify(key,body){
   const time=Date.now(),last=S.lastAlarms.get(key)||0;
   if(time-last<1800000)return;S.lastAlarms.set(key,time);
   if(S.sound&&S.ctx){try{const osc=S.ctx.createOscillator(),g=S.ctx.createGain();osc.frequency.value=630;g.gain.value=.06;osc.connect(g).connect(S.ctx.destination);osc.start();osc.stop(S.ctx.currentTime+.35);}catch(e){}}
   if("Notification" in window&&Notification.permission==="granted"&&document.visibilityState==="visible"){
    try{new Notification("COIN.LIVE alarm",{body});}catch(e){}
   }
 }
 $("soundButton").onclick=async()=>{
   if(!S.sound){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error("Tarayıcı desteklemiyor");S.ctx=S.ctx||new C();await S.ctx.resume();S.sound=true;$("soundButton").classList.add("on");$("soundButton").textContent="🔊 Ses açık";}
     catch(e){error("Alarm sesi açılamadı: "+e.message);}}
   else{S.sound=false;$("soundButton").classList.remove("on");$("soundButton").textContent="🔕 Alarm sesi";}
 };
 $("notificationButton").onclick=async()=>{
   if(!("Notification" in window)){error("Tarayıcı bu bildirim özelliğini desteklemiyor.");return;}
   try{const result=await Notification.requestPermission();$("notificationButton").textContent=result==="granted"?"🔔 Bildirim açık":"🔕 İzin yok";}
   catch(e){error("Bildirim izni alınamadı: "+e.message);}
 };
 $("calcButton").onclick=()=>{$("calculatorModal").classList.add("open");renderRisk(mainPick());};
 $("closeCalculator").onclick=()=>$("calculatorModal").classList.remove("open");
 $("saveBalance").onclick=()=>{let v=Number($("balanceInput").value);if(!Number.isFinite(v)||v<10||v>1000000){error("Bakiye 10–1.000.000 USDT arasında olmalı.");return;}S.balance=v;localStorage.setItem("coinlive.balance",v);$("calculatorModal").classList.remove("open");render();};
 $("resetBalance").onclick=()=>{$("balanceInput").value="100";S.balance=100;localStorage.setItem("coinlive.balance","100");render();};
 $("balanceInput").oninput=()=>{let v=+($("balanceInput").value);if(v>=10&&v<=1000000){const old=S.balance;S.balance=v;renderRisk(mainPick());S.balance=old;}};
 $("calculatorModal").onclick=e=>{if(e.target===$("calculatorModal"))$("calculatorModal").classList.remove("open");};
 function normalizedNews(x){
   const d=Array.isArray(x.Data)?x.Data:[];
   return d.map(z=>({title:String(z.title||"").slice(0,180),src:String(z.source_info?.name||z.source||"CryptoCompare"),url:z.url,date:Number(z.published_on||0)*1000}))
    .filter(z=>{try{const link=new URL(z.url);return link.protocol==="https:"&&z.title.length>=12&&z.date>0&&z.date<Date.now()+60000;}catch(e){return false;}})
    .sort((a,b)=>b.date-a.date).slice(0,12);
 }
 async function loadNews(){
   try{const data=await request("https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest");
     S.news=normalizedNews(data);S.newsFetched=Date.now();
     if(!S.news.length)throw Error("Haber bulunamadı");
     $("newsStatus").textContent="CryptoCompare · "+dtime(S.newsFetched)+" güncellendi";
     $("newsList").innerHTML=S.news.map(x=>'<a class="newsLine" href="'+escape(x.url)+'" target="_blank" rel="noopener noreferrer"><strong>'+escape(x.title)+'</strong><small>'+escape(x.src)+' · '+dLong(x.date)+'</small></a>').join("");
     const x=S.news[0];$("newsTicker").innerHTML='<a href="'+escape(x.url)+'" target="_blank" rel="noopener noreferrer">'+escape(x.title)+'</a> <small>'+escape(x.src)+' · '+dLong(x.date)+'</small>';
   }catch(e){$("newsStatus").textContent="Ücretsiz haber API erişimi yok";
    $("newsTicker").textContent="Canlı haber kaynağına erişilemiyor. Doğrulanmamış başlık gösterilmiyor.";
    $("newsList").innerHTML='<div class="newsEmpty">Haber API bağlantısı bu tarayıcıda engelli. Aşağıdaki yayıncı bağlantılarından haberleri açabilirsin.</div>';
   }
 }
 async function bootstrap(){
   $("count").textContent="…";connection("VERİ YÜKLENİYOR","error");
   await loadSnapshots();
   const sig=await request("./signals-snapshot.json?init="+Date.now()).catch(()=>null);
   if(sig?.signals){S.signalProvider=sig.provider;S.signalSet=sig.signals;S.bySymbol=new Map(sig.signals.map(x=>[x.symbol,x]));
      S.signalStamp=Date.parse(sig.fetched_at)||0;$("analyzedCount").textContent=sig.analyzed||0;render();}
   await direct();track();S.refreshTimer=setInterval(poll,15000);setInterval(loadSnapshots,5*60000);setInterval(loadNews,300000);loadNews();
 }
 S.signalProvider="";
 if(typeof ResizeObserver!=="undefined")new ResizeObserver(draw).observe($("chart"));else window.addEventListener("resize",draw);
 bootstrap().catch(e=>error("Başlatma hatası: "+e.message));
})();