"use strict";
/* COIN.LIVE EDGE — automatic 15m/1h/4h early-warning radar.
 * Uses fresh public exchange candles directly in the browser.
 * Never relies on aged GitHub JSON to issue a trading signal.
 * Browser tab must stay open for scanning / local notifications.
 */
(() => {
 const API=window.CoinLiveDesk;
 if(!API)return;
 const S=API.state,$=id=>document.getElementById(id);
 const E={records:new Map(),alerts:[],busy:false,lastScan:0,lastMarket:0,source:"",completed:0,cycle:0,warnings:new Map()};
 const interval={ "15m":900000, "1h":3600000, "4h":14400000 };
 const valid=n=>Number.isFinite(n)&&n>0;
 const fmt=API.fmt, pct=API.pct;
 const html=t=>String(t??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
 const stdev=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));};
 const EMA=(a,p)=>{let e=a[0],alpha=2/(p+1);for(const c of a.slice(1))e+=alpha*(c-e);return e;};
 const RSI=a=>{const d=a.slice(-15).map((x,i,v)=>i?x-v[i-1]:0).slice(1),gain=mean(d.map(x=>Math.max(0,x))),loss=mean(d.map(x=>Math.max(0,-x)));return loss===0?100:100-100/(1+gain/loss);};
 const ATR=a=>{const s=a.slice(-15);return mean(s.slice(1).map((x,i)=>Math.max(x.h-x.l,Math.abs(x.h-s[i].c),Math.abs(x.l-s[i].c))));};
 const current=()=>S.live&&Date.now()-S.lastLive<45000;
 async function fetchData(url,body){
  const ctrl=new AbortController(),tid=setTimeout(()=>ctrl.abort(),7800);
  try{
   const r=await fetch(url,{method:body?"POST":"GET",body:body?JSON.stringify(body):undefined,headers:body?{"Content-Type":"application/json"}:{},signal:ctrl.signal,cache:"no-store"});
   if(!r.ok)throw Error("HTTP "+r.status);
   const data=await r.json();return data;
  }finally{clearTimeout(tid);}
 }
 async function candles(m,tf){
  let list;
  if(S.provider==="OKX"){
    const name=m.symbol.replace(/USDT$/,"-USDT-SWAP"),bar={"15m":"15m","1h":"1H","4h":"4H"}[tf];
    const d=await fetchData("https://www.okx.com/api/v5/market/candles?instId="+encodeURIComponent(name)+"&bar="+bar+"&limit=90");
    if(d.code!=="0"||!Array.isArray(d.data))throw Error("OKX mum yok");
    list=d.data.map(x=>({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]}));
  }else if(S.provider==="Hyperliquid"){
    const end=Date.now(),coin=m.symbol.replace(/USDT$/,"");
    const d=await fetchData("https://api.hyperliquid.xyz/info",
      {type:"candleSnapshot",req:{coin,interval:tf,startTime:end-interval[tf]*100,endTime:end}});
    if(!Array.isArray(d))throw Error("Hyperliquid mum yok");
    list=d.map(x=>({t:+x.t,o:+x.o,h:+x.h,l:+x.l,c:+x.c,v:+x.v}));
  }else throw Error("Doğrudan mum bağlantısı yok");
  const t=Date.now();
  return list.filter(x=>valid(x.h)&&valid(x.l)&&valid(x.c)&&Number.isFinite(x.t)&&x.t+interval[tf]<t-1500)
    .sort((a,b)=>a.t-b.t);
 }
 function makeAnalysis(m,frames,provider){
   const a=frames[0],b=frames[1],c=frames[2],price=m.price,stamp=Date.now();
   if(Math.min(a.length,b.length,c.length)<55)return null;
   const closeA=a.map(x=>x.c),closeB=b.map(x=>x.c),closeC=c.map(x=>x.c);
   const e15=EMA(closeA.slice(-65),20),e20=EMA(closeB.slice(-65),20),e50=EMA(closeB.slice(-65),50),e4=EMA(closeC.slice(-65),20);
   const rsi=RSI(closeB),atr=ATR(a);
   const previous20=a.slice(-21,-1).map(x=>x.v),volratio=valid(mean(previous20))?a.at(-1).v/mean(previous20):0;
   const last=a.at(-1),prev=a.at(-2);
   const prior=a.slice(-9,-1),resistance=Math.max(...prior.map(x=>x.h)),support=Math.min(...prior.map(x=>x.l));
   const bbt=closeA.slice(-20),width=4*stdev(bbt)/mean(bbt)*100,atrPct=atr/price*100;
   const up=e20>e50 && b.at(-1).c>e20 && c.at(-1).c>e4 && price>e15 && rsi>49 && rsi<74;
   const down=e20<e50 && b.at(-1).c<e20 && c.at(-1).c<e4 && price<e15 && rsi>26 && rsi<51;
   const nearUp=(resistance-price)/price*100,nearDown=(price-support)/price*100;
   // Watch a price approaching an established closed-15m level, not one already far beyond it.
   const shortRange=a.slice(-14,-1);
   const high=Math.max(...shortRange.map(x=>x.h)),low=Math.min(...shortRange.map(x=>x.l));
   const distUp=(high-price)/price*100,distDown=(price-low)/price*100;
   const alignedUp=e20>e50 && c.at(-1).c>e4;
   const alignedDown=e20<e50 && c.at(-1).c<e4;
   const possibleUp=alignedUp&&distUp>=-.22&&distUp<=1.2;
   const possibleDown=alignedDown&&distDown>=-.22&&distDown<=1.2;
   const side=possibleUp&&(!possibleDown||distUp<=distDown)?"LONG":possibleDown?"SHORT":null;
   const distance=side==="LONG"?distUp:distDown;
   const liqBonus=m.volume>=200000000?12:m.volume>=50000000?9:m.volume>=15000000?6:0;
   const volumeBonus=Math.min(22,Math.max(0,(volratio-.7)*24));
   const compressionBonus=width<3?15:width<5?10:width<8?5:0;
   const proximityBonus=side?Math.max(0,34-distance*25):0;
   const trendBonus=side?20:0;
   let radarScore=Math.min(100,Math.round(liqBonus+volumeBonus+compressionBonus+proximityBonus+trendBonus));
   if(Math.abs(m.change)>17)radarScore-=20;
   const atrOK=atrPct>=.08 && atrPct<=6.5;
   if(!atrOK||m.volume<15000000)radarScore=0;
   const reason=side?
     (side==="LONG"?"Yukarı":"Aşağı")+" eşik %"+Math.max(0,distance).toFixed(2)+
     " uzakta · 15m hacim "+volratio.toFixed(2)+"x · 1H/4H "+(side==="LONG"?"pozitif":"negatif"):
     "15m fiyat seviyesi ve 1H/4H yönü henüz eşleşmedi";
   const early={symbol:m.symbol,side:side||"NÖTR",score:radarScore,near:distance,volratio,width,
      provider,updatedAt:stamp,price,reason,volume:m.volume,trend:alignedUp?"YUKARI":alignedDown?"AŞAĞI":"KARIŞIK",atrPct};
   const bullTrigger=last.c>resistance&&last.c>last.o || prev.c<e15&&last.c>e15&&last.c>last.o;
   const bearTrigger=last.c<support&&last.c<last.o || prev.c>e15&&last.c<e15&&last.c<last.o;
   let direction=up&&bullTrigger&&volratio>=1.15?"AL":down&&bearTrigger&&volratio>=1.15?"SAT":"BEKLE";
   const dist=Math.max(price*.009,atr*1.7),stopPct=dist/price*100;
   const priceGap=Math.abs(price-last.c)/price;
   if(stopPct<.3||stopPct>5.5||priceGap>.04||Math.abs(m.change)>20)direction="BEKLE";
   let signal=null;
   if(direction!=="BEKLE"){
    const sign=direction==="AL"?1:-1,entry=price,stop=Number((price-sign*dist).toPrecision(12));
    const score=Math.max(0,Math.min(100,Math.round(55+Math.min(20,(volratio-1)*20)+Math.min(10,Math.abs(e20-e50)/e20*500))));
    signal={symbol:m.symbol,quote:m.quote,provider,engine:"BROWSER",signal:direction,score,price,entry,stop,
      targets:[1,2,3].map(mult=>Number((entry+sign*dist*mult).toPrecision(12))),
      stop_pct:stopPct,analysis_time:new Date(stamp).toISOString(),generatedAt:stamp,
      rsi,atr,vol_ratio:volratio,bb_width:width,volume:m.volume,change:m.change,why:
      "Kapanmış 15m tetik + 1H EMA/RSI + 4H trend + hacim "+volratio.toFixed(2)+"x",
      candles_15m:a.slice(-65).map(x=>[x.t,x.o,x.h,x.l,x.c,x.v])};
   }
   early.candles_15m=a.slice(-65).map(x=>[x.t,x.o,x.h,x.l,x.c,x.v]);
   return {early,signal};
 }
 function choose(){
  const pool=S.market.filter(x=>x.volume>=15000000&&valid(x.price)&&x.quote===(S.provider==="Hyperliquid"?"USDC":"USDT"))
    .sort((a,b)=>{
      const sa=E.records.get(a.symbol),sb=E.records.get(b.symbol);
      const ta=sa?.updatedAt||0,tb=sb?.updatedAt||0;
      if(ta!==tb)return ta-tb;
      const rank=x=>Math.log10(x.volume)*4+Math.min(15,Math.abs(x.change))*1.4-(Math.abs(x.change)>20?20:0);
      return rank(b)-rank(a);
    });
  return pool.slice(0,4);
 }
 function register(text,type,key){
  const t=Date.now(),old=E.warnings.get(key)||0;
  if(t-old<15*60000)return;
  E.warnings.set(key,t);
  E.alerts.unshift({text,type,at:t});
  E.alerts=E.alerts.slice(0,14);
  API.notify("edge-"+key,text,true);
 }
 function currentEarly(){
  const t=Date.now();
  return [...E.records.values()].filter(x=>x.provider===S.provider&&x.updatedAt>=t-12*60000&&x.score>=45&&x.side!=="NÖTR")
    .sort((a,b)=>b.score-a.score||a.near-b.near);
 }
 function bestChartSignal(){
  const x=currentEarly()[0];if(!x)return null;
  return {symbol:x.symbol,score:x.score,signal:"BEKLE",candles_15m:x.candles_15m,quote:S.prices.get(x.symbol)?.quote||"USDT"};
 }
 function display(){
  const live=current(),records=currentEarly(),alerts=E.alerts;
  const label=$("edgeStatus");
  if(!label)return;
  label.textContent=live?
    "CANLI "+S.provider+" · "+E.records.size+" coin analiz edildi · erken tetikler sadece izleme amaçlı":
    "GÜNCEL VERİ YOK · erken uyarılar durduruldu; borsaya yeniden bağlanılıyor";
  const stat=$("edgeHeadline");
  if(stat){
   const strong=records.find(x=>x.score>=68&&x.near<=.9&&x.near>=-.22);
   stat.textContent=!live?"BAĞLANTI BEKLENİYOR":strong?strong.symbol.replace(/USDT$/,"")+" · "+strong.side+" EŞİĞİ":"ERKEN FIRSAT TARANIYOR";
   stat.className="edgeHeadline "+(!live?"muted":strong?"focused":"");
  }
  const rows=$("edgeCandidates");
  if(rows)rows.innerHTML=live&&records.length?
   records.slice(0,5).map((x,i)=>'<div class="rank"><div class="rankNum">'+(i+1)+'</div><div><div class="rankSymbol">'+html(x.symbol.replace(/USDT$/,""))+' <span class="chip '+(x.side==="LONG"?"long":"short")+'">'+x.side+' EŞİĞİ</span></div>'+
      '<div class="rankSub">'+html(x.reason)+'</div></div><div class="rankRight"><span class="score">'+x.score+'/100</span>'+
      '<small class="grey">radar puanı</small></div></div>').join(""):
   '<div class="newsEmpty">'+(live?"Henüz 1H/4H uyumlu yakın eşik bulunmadı. Yeni mumlar taranıyor.":"Son 30 dakikalık fiyat yedeği işlem için kullanılmaz. Canlı bağlantı gerekli.")+'</div>';
  const log=$("edgeAlertLog");
  if(log)log.innerHTML=alerts.length?alerts.slice(0,5).map(x=>
     '<div class="edgeAlert '+(x.type==="risk"?"red":"")+'"><span>'+html(x.text)+'</span><small>'+
      new Date(x.at).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})+'</small></div>').join(""):
     '<div class="newsEmpty">Henüz uygun erken uyarı oluşmadı. Sadece koşullar karşılandığında bildirim gösterilir.</div>';
 }
 async function scan(){
  if(E.busy||!current())return;
  E.busy=true;E.lastScan=Date.now();
  const venue=S.provider;
  if(E.source!==venue){E.source=venue;E.records.clear();S.localSignals.clear();E.completed=0;}
  const batch=choose();
  // One batch ~4 symbols x 3 candle timeframes, never an unbounded request storm.
  const work=await Promise.allSettled(batch.map(async m=>{
   const bars=await Promise.all(["15m","1h","4h"].map(tf=>candles(m,tf)));
   return {m,result:makeAnalysis(m,bars,venue)};
  }));
  if(venue!==S.provider){E.busy=false;return;}
  for(const item of work){
   if(item.status!=="fulfilled"||!item.value.result)continue;
   const {m,result}=item.value,x=result.early;
   E.records.set(m.symbol,x);E.completed++;
   if(result.signal){
      S.localSignals.set(m.symbol,result.signal);
      if(result.signal.score>=65)register(m.symbol+" "+result.signal.signal+" · kapanmış mum teyidi · "+venue+" · risk ≤%1 hedef", "signal",m.symbol+"-confirmed-"+result.signal.signal);
   }else S.localSignals.delete(m.symbol);
   if(x.score>=72&&x.near>=-.22&&x.near<=.85&&x.volratio>=1.05){
     register(m.symbol+" · "+x.side+" eşiğine "+Math.max(0,x.near).toFixed(2)+"% · hacim "+x.volratio.toFixed(2)+"x · İZLE / işlem değil","watch",m.symbol+"-"+x.side+"-pre");
   }
  }
  E.busy=false;API.render();display();
 }
 function movementWatch(){
  if(!current())return;
  const t=Date.now(),candidates=[];
  for(const m of S.market){
    if(m.volume<20000000)continue;
    const hist=S.priceHistory.get(m.symbol);
    if(!hist||hist.length<2||t-hist[0][0]<240000)continue;
    const diff=(m.price/hist[0][1]-1)*100;
    if(Math.abs(diff)>=.6&&Math.abs(diff)<=7)candidates.push({symbol:m.symbol,diff,volume:m.volume});
  }
  for(const m of candidates.sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,2)){
    register(m.symbol+" · 5 dakikada "+pct(m.diff)+" · ilk hızlanma; yön teyidi aranıyor","move",m.symbol+"-movement-"+(m.diff>0?"UP":"DOWN"));
  }
 }
 function tick(){
  if(!current()){display();return;}
  movementWatch();
  if(!E.busy&&Date.now()-E.lastScan>48000)scan();
  display();
 }
 window.CoinLiveEdge={bestChartSignal,display,scan};
 // Do not mistake stale server data for an early opportunity.
 setInterval(tick,10000);
 setTimeout(tick,1800);
})();
