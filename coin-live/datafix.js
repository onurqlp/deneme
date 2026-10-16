
"use strict";
(()=>{
 const API=window.CoinLiveAPI;if(!API)return;
 const S=API.S, el=id=>document.getElementById(id),F="https://fapi.binance.com",B="https://api.bybit.com",O="https://www.okx.com",H="https://api.hyperliquid.xyz/info";
 let busy=false,mode="",reqId=0,refreshTimer=0,priceTimer=0,snapshotState=null;
 const num=v=>v==null?NaN:Number(v);
 const positive=n=>Number.isFinite(n)&&n>0;
 const now=()=>Date.now();
 async function request(url,body){
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
   try{
     const result=await fetch(url,{method:body?"POST":"GET",headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined,cache:"no-store",signal:ctrl.signal});
     if(!result.ok)throw Error("HTTP "+result.status);
     return await result.json();
   }finally{clearTimeout(timer);}
 }
 function status(message,live){
   el("connection").textContent=message;
   el("dot").classList.toggle("on",!!live);
 }
 function notice(message){const e=el("error");e.style.display=message?"block":"none";e.textContent=message||"";}
 function halt(){
   reqId++;
   clearInterval(refreshTimer);clearInterval(priceTimer);
   for(const timer of S.timers||[])clearInterval(timer);
   S.timers=[];
   for(const ws of S.ws||[]){try{ws.onclose=null;ws.close();}catch(e){}}
   S.ws=[];S.connected=false;S.techLock=false;S.oiLock=false;S.key++;S.lastTick=0;
 }
 function initialize(rows,provider){
   S.provider=provider;S.items.clear();
   for(const row of rows.slice(0,100)){
     if(!positive(row.price)||!positive(row.volume)||!/USDT$/.test(row.symbol))continue;
     const funding=row.funding===null||row.funding===undefined?NaN:num(row.funding);
     const oi=row.oi===null||row.oi===undefined?NaN:num(row.oi);
     S.items.set(row.symbol,{symbol:row.symbol,venueCoin:row.venueCoin||row.symbol.replace(/USDT$/,""),
       quote:row.quote||"USDT",price:num(row.price),change:num(row.change),volume:num(row.volume),
       funding,oi,oiAt:now(),oiDelta:NaN,history:[],five:NaN,ready:false,tech:null,techAt:0,sig:"BEKLE",
       entry:NaN,stop:NaN,targets:[],why:"Piyasa verisi güncelleniyor",rsi:NaN,atr:NaN});
   }
   el("count").textContent=S.items.size;
   el("chartCoin").dataset.provider=""; // force dropdown rebuild for new source
   if(!S.items.has(S.selected))S.selected=S.items.has("BTCUSDT")?"BTCUSDT":S.items.keys().next().value||"BTCUSDT";
   API.render();
 }
 function snapshotApply(obj){
   const age=now()-Date.parse(obj.fetched_at),m=Math.max(0,Math.floor(age/60000));
   if(!Array.isArray(obj.rows)||obj.rows.length<20||!Number.isFinite(age)||age>1800000||age< -600000)
     throw Error("Güncel yedek veri bulunamadı.");
   if(S.provider!=="Snapshot"||!snapshotState||snapshotState.provider!==obj.provider){
     initialize(obj.rows,"Snapshot");
   }else{
     for(const row of obj.rows){const o=S.items.get(row.symbol);if(!o)continue;
       if(positive(row.price))o.price=num(row.price);
       if(positive(row.volume))o.volume=num(row.volume);
       o.change=num(row.change);o.funding=row.funding==null?NaN:num(row.funding);
       o.oi=row.oi==null?NaN:num(row.oi);
     }
   }
   snapshotState=obj;S.snapshotVenue=obj.provider;S.snapshotAt=Date.parse(obj.fetched_at);
   S.lastTick=S.snapshotAt;S.connected=false;
   el("sourceName").textContent="YEDEK · "+obj.provider+" · "+m+" dk eski";
   el("techStatus").textContent="5 dakikalık veri yedeği · gerçek zamanlı AL/SAT kapalı";
   status("YEDEK "+m+" DK",false);
   API.render();
 }
 async function readSnapshot(){
   const data=await request("./market-snapshot.json?time="+now());
   const age=now()-Date.parse(data.fetched_at);
   if(!Number.isFinite(age)||age>1800000)throw Error("GitHub verisi 30 dakikadan eski");
   return data;
 }
 async function autoSnapshot(){
   if(S.provider!=="Snapshot")return;
   try{snapshotApply(await readSnapshot());notice("Canlı borsa API'si engelli. OKX tabanlı yedek veri gösteriliyor; zaman damgasını kontrol edin.");}
   catch(e){S.connected=false;S.lastTick=0;status("VERİ ESKİ",false);notice("Yedek veri güncellenemedi: "+e.message);}
 }
 function startSnapshot(){clearInterval(refreshTimer);refreshTimer=setInterval(autoSnapshot,60000);}
 function mapOKX(raw){
   if(raw.code!=="0"||!Array.isArray(raw.data))throw Error("OKX yanıtı geçersiz");
   return raw.data.filter(x=>/^[A-Z0-9]+-USDT-SWAP$/.test(x.instId)).map(x=>{
     const p=num(x.last),prev=num(x.open24h),quoted=num(x.volCcyQuote24h),units=num(x.volCcy24h);
     return {symbol:x.instId.replace("-USDT-SWAP","USDT"),quote:"USDT",price:p,volume:positive(quoted)?quoted:units*p,change:positive(prev)?(p/prev-1)*100:NaN,funding:NaN,oi:NaN};
   }).filter(x=>positive(x.price)&&positive(x.volume)).sort((a,b)=>b.volume-a.volume).slice(0,100);
 }
 function mapHyper(raw){
   if(!Array.isArray(raw)||raw.length!==2||!Array.isArray(raw[0].universe)||!Array.isArray(raw[1]))throw Error("Hyperliquid yanıtı geçersiz");
   return raw[0].universe.map((meta,i)=>{
     const x=raw[1][i]||{},coin=meta.name||"",p=num(x.markPx||x.midPx),prev=num(x.prevDayPx),size=num(x.openInterest);
     return {symbol:coin+"USDT",venueCoin:coin,quote:"USDC",price:p,
       change:positive(prev)?(p/prev-1)*100:NaN,volume:num(x.dayNtlVlm),funding:num(x.funding),oi:positive(size)?size*p:NaN};
   }).filter(x=>/^[A-Z0-9]{2,25}USDT$/.test(x.symbol)&&positive(x.price)&&positive(x.volume))
     .sort((a,b)=>b.volume-a.volume).slice(0,100);
 }
 function mapBybit(raw){
   if(raw.retCode!==0||!Array.isArray(raw.result?.list))throw Error("Bybit yanıtı geçersiz");
   return raw.result.list.filter(x=>/^[A-Z0-9]+USDT$/.test(x.symbol))
     .map(x=>({symbol:x.symbol,quote:"USDT",price:num(x.lastPrice),change:num(x.price24hPcnt)*100,
       volume:num(x.turnover24h),funding:num(x.fundingRate),oi:num(x.openInterestValue)}))
     .filter(x=>positive(x.volume)&&positive(x.price)).sort((a,b)=>b.volume-a.volume).slice(0,100);
 }
 async function market(source){
   if(source==="OKX")return mapOKX(await request(O+"/api/v5/market/tickers?instType=SWAP"));
   if(source==="Hyperliquid")return mapHyper(await request(H,{type:"metaAndAssetCtxs"}));
   if(source==="Bybit")return mapBybit(await request(B+"/v5/market/tickers?category=linear"));
   if(source==="Binance"){
     const [raw,info]=await Promise.all([request(F+"/fapi/v1/ticker/24hr"),request(F+"/fapi/v1/exchangeInfo")]);
     const valid=new Set(info.symbols.filter(x=>x.quoteAsset==="USDT"&&x.contractType==="PERPETUAL"&&x.status==="TRADING").map(x=>x.symbol));
     return raw.filter(x=>valid.has(x.symbol)).map(x=>({symbol:x.symbol,quote:"USDT",price:num(x.lastPrice),change:num(x.priceChangePercent),volume:num(x.quoteVolume),funding:NaN,oi:NaN}))
       .filter(x=>positive(x.price)&&positive(x.volume)).sort((a,b)=>b.volume-a.volume).slice(0,100);
   }
   throw Error("Bilinmeyen kaynak");
 }
 function liveUpdate(source,rows,token){
   if(token!==reqId||S.provider!==source)return;
   for(const r of rows){
     const o=S.items.get(r.symbol);if(!o)continue;
     const old=o.price,stamp=now();o.price=r.price;
     o.change=r.change;o.volume=r.volume;o.funding=r.funding;o.quote=r.quote;
     if(positive(r.oi)){if(positive(o.oi)&&stamp-o.oiAt>60000)o.oiDelta=(r.oi/o.oi-1)*100;o.oi=r.oi;o.oiAt=stamp;}
     const hist=o.history||[];if(!hist.length||stamp-hist[hist.length-1][0]>10000)hist.push([stamp,r.price]);
     while(hist.length>1&&hist[1][0]<=stamp-300000)hist.shift();o.history=hist;
     o.ready=hist.length>1&&stamp-hist[0][0]>270000;
     o.five=o.ready?(r.price/hist[0][1]-1)*100:NaN;
     if(typeof API.checkAlert==="function")API.checkAlert(o,"MOVE");
   }
   S.lastTick=now();S.connected=true;
   el("sourceName").textContent=source+" · DOĞRUDAN API · "+(source==="Hyperliquid"?"USDC":"USDT")+" PERP";
   status(source.toUpperCase()+" · CANLI",true);notice("");API.render();
 }
 async function startLive(source,rows){
   initialize(rows,source);liveUpdate(source,rows,reqId);
   clearInterval(priceTimer);
   const token=reqId;
   let consecutiveFailures=0,working=false;
   priceTimer=setInterval(async()=>{
     if(working||token!==reqId)return;
     working=true;
     try{const newest=await market(source);if(newest.length<20)throw Error("Parite az");liveUpdate(source,newest,token);consecutiveFailures=0;}
     catch(e){consecutiveFailures++;if(consecutiveFailures>=3&&token===reqId){S.connected=false;status("CANLI KAYNAK KOPTU",false);notice(source+" bağlantısı koptu, veri yedeğine geçiliyor.");activate();}}
     finally{working=false;}
   },source==="Hyperliquid"?7000:15000);
   API.scanTech();
   S.timers.push(setInterval(API.scanTech,16000));
 }
 async function activate(){
   if(busy)return;busy=true;halt();
   status("GÜNCEL VERİ ARANIYOR",false);notice("");let backup=null;
   try{backup=await readSnapshot();snapshotApply(backup);}catch(e){notice("GitHub veri yedeği henüz erişilemiyor: "+e.message);}
   const choice=el("provider").value,options=choice==="Auto"?["OKX","Hyperliquid","Binance","Bybit"]:choice==="Snapshot"?[]:[choice];
   let connected=false,issues=[];
   for(const source of options){
     try{const rows=await market(source);if(rows.length<20)throw Error("Yetersiz parite");
       halt();await startLive(source,rows);connected=true;break;
     }catch(e){issues.push(source+" "+e.message);}
   }
   if(!connected){
     if(backup){snapshotApply(backup);startSnapshot();notice("Doğrudan borsa bağlantıları çalışmıyor. "+backup.provider+" kaynağından "+Math.round((now()-Date.parse(backup.fetched_at))/60000)+" dakika önce alınmış veri gösteriliyor. Gerçek zamanlı sinyaller kapalı.");}
     else{status("VERİ YOK",false);notice("Canlı kaynaklar ve veri yedeği kullanılamıyor: "+issues.join(" | "));}
   }
   busy=false;API.render();
 }
 async function candles(o,tf){
   if(S.provider==="Snapshot")throw Error("Yedek fiyat verisi OHLC mum içermez, grafik için canlı kaynağa geçin");
   if(S.provider!=="Hyperliquid")throw Error("Kaynak için Hyperliquid mumu değil");
   const span={"15m":900000,"1h":3600000,"4h":14400000,"1d":86400000}[tf]||900000,end=now();
   const raw=await request(H,{type:"candleSnapshot",req:{coin:o.venueCoin||o.symbol.replace(/USDT$/,""),interval:tf,startTime:end-span*98,endTime:end}});
   if(!Array.isArray(raw))throw Error("Mum API yanıtı hatası");
   return raw.map(x=>({t:num(x.t),open:num(x.o),high:num(x.h),low:num(x.l),close:num(x.c),vol:num(x.v)})).sort((a,b)=>a.t-b.t);
 }
 const originalCandles=API.candles;
 API.activate=activate;API.candles=async(o,tf)=>{
   if(["Hyperliquid","Snapshot"].includes(S.provider))return candles(o,tf);
   return originalCandles(o,tf);
 };
 window.CoinLiveFix={activate,candles,readSnapshot};
 // Use as soon as deferred scripts load; initial base app defers activation.
 el("provider").onchange=activate;el("refreshBtn").onclick=activate;
})();
